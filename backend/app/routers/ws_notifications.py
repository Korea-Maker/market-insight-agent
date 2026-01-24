"""
알림 WebSocket 라우터 모듈
사용자별 실시간 알림 전달을 위한 WebSocket 엔드포인트
"""
import asyncio
import json
import logging
from typing import Dict, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Query

from app.core.redis import get_redis_client, get_redis_pubsub, REDIS_ENABLED
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter()


class NotificationConnectionManager:
    """
    알림 WebSocket 연결 관리자

    사용자별로 WebSocket 연결을 관리하고
    Redis Pub/Sub을 통해 실시간 알림을 전달합니다.
    """

    def __init__(self) -> None:
        # user_id -> WebSocket connections
        self.user_connections: Dict[int, Set[WebSocket]] = {}
        # WebSocket -> user_id (역방향 매핑)
        self.connection_users: Dict[WebSocket, int] = {}
        # Redis 구독 태스크
        self.subscribe_tasks: Dict[int, asyncio.Task] = {}
        self.running = False

    async def connect(self, websocket: WebSocket, user_id: int) -> None:
        """
        사용자 연결 등록

        Args:
            websocket: WebSocket 인스턴스
            user_id: 사용자 ID
        """
        await websocket.accept()

        # 사용자 연결 등록
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()

        self.user_connections[user_id].add(websocket)
        self.connection_users[websocket] = user_id

        logger.info(f"알림 연결: user_id={user_id}, 연결 수={len(self.user_connections[user_id])}")

        # Redis 구독 시작
        if REDIS_ENABLED and user_id not in self.subscribe_tasks:
            self.subscribe_tasks[user_id] = asyncio.create_task(
                self._subscribe_user_channel(user_id)
            )

    async def disconnect(self, websocket: WebSocket) -> None:
        """
        연결 해제

        Args:
            websocket: 해제할 WebSocket 인스턴스
        """
        user_id = self.connection_users.pop(websocket, None)
        if user_id is None:
            return

        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)

            # 해당 사용자의 모든 연결이 종료된 경우
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

                # Redis 구독 중지
                if user_id in self.subscribe_tasks:
                    self.subscribe_tasks[user_id].cancel()
                    try:
                        await self.subscribe_tasks[user_id]
                    except asyncio.CancelledError:
                        pass
                    del self.subscribe_tasks[user_id]

        logger.info(f"알림 연결 해제: user_id={user_id}")

    async def send_to_user(self, user_id: int, message: Dict[str, Any]) -> None:
        """
        특정 사용자에게 메시지 전송

        Args:
            user_id: 사용자 ID
            message: 전송할 메시지
        """
        connections = self.user_connections.get(user_id, set())
        disconnected: Set[WebSocket] = set()

        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.warning(f"알림 전송 실패 (user_id={user_id}): {e}")
                disconnected.add(websocket)

        # 끊어진 연결 제거
        for websocket in disconnected:
            await self.disconnect(websocket)

    async def _subscribe_user_channel(self, user_id: int) -> None:
        """
        사용자별 Redis 채널 구독

        Args:
            user_id: 사용자 ID
        """
        pubsub = await get_redis_pubsub()
        if not pubsub:
            return

        channel = f"notifications:{user_id}"
        broadcast_channel = "notifications:broadcast"

        try:
            await pubsub.subscribe(channel, broadcast_channel)
            logger.info(f"Redis 알림 채널 구독 시작: {channel}")

            while True:
                try:
                    message = await asyncio.wait_for(
                        pubsub.get_message(ignore_subscribe_messages=True),
                        timeout=1.0,
                    )

                    if message and message["type"] == "message":
                        try:
                            data = json.loads(message["data"])
                            await self.send_to_user(user_id, data)
                        except json.JSONDecodeError:
                            logger.warning(f"잘못된 알림 메시지 형식")

                except asyncio.TimeoutError:
                    # 연결 확인
                    if user_id not in self.user_connections:
                        break
                    continue

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Redis 알림 구독 오류 (user_id={user_id}): {e}")
        finally:
            try:
                await pubsub.unsubscribe(channel, broadcast_channel)
            except Exception:
                pass
            logger.info(f"Redis 알림 채널 구독 해제: {channel}")


# 전역 인스턴스
notification_manager = NotificationConnectionManager()


@router.websocket("/ws/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    token: Optional[str] = Query(None, description="JWT 토큰"),
) -> None:
    """
    실시간 알림 WebSocket 엔드포인트

    인증된 사용자에게 실시간 알림을 전달합니다.
    연결 시 JWT 토큰을 쿼리 파라미터로 전달해야 합니다.

    Example:
        ws://localhost:8000/ws/notifications?token=<JWT_TOKEN>
    """
    # 토큰 검증
    if not token:
        await websocket.accept()
        await websocket.send_json({
            "type": "error",
            "code": "AUTH_REQUIRED",
            "message": "인증이 필요합니다. token 파라미터를 포함해 주세요.",
        })
        await websocket.close(code=4001, reason="Authentication required")
        return

    # JWT 토큰 검증
    try:
        payload = AuthService.verify_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Invalid token payload")
        user_id = int(user_id)
    except Exception as e:
        await websocket.accept()
        await websocket.send_json({
            "type": "error",
            "code": "AUTH_FAILED",
            "message": "인증에 실패했습니다. 토큰이 만료되었거나 유효하지 않습니다.",
        })
        await websocket.close(code=4002, reason="Authentication failed")
        return

    # Redis 비활성화 시
    if not REDIS_ENABLED:
        await websocket.accept()
        await websocket.send_json({
            "type": "warning",
            "code": "REDIS_DISABLED",
            "message": "실시간 알림이 비활성화되어 있습니다. REST API를 통해 알림을 확인하세요.",
        })
        # 연결은 유지하되 실시간 알림은 불가

    # 연결 등록
    await notification_manager.connect(websocket, user_id)

    try:
        # 연결 성공 메시지
        await websocket.send_json({
            "type": "connected",
            "message": "알림 연결이 설정되었습니다.",
            "user_id": user_id,
        })

        # 연결 유지 및 클라이언트 메시지 수신
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0,
                )

                # 클라이언트 메시지 처리
                try:
                    message = json.loads(data)
                    msg_type = message.get("type")

                    if msg_type == "ping":
                        await websocket.send_json({"type": "pong"})
                    elif msg_type == "mark_read":
                        # 읽음 처리 요청은 REST API 사용 권장
                        await websocket.send_json({
                            "type": "info",
                            "message": "읽음 처리는 REST API를 사용해 주세요.",
                        })

                except json.JSONDecodeError:
                    pass

            except asyncio.TimeoutError:
                # 하트비트 전송
                try:
                    await websocket.send_json({"type": "heartbeat"})
                except Exception:
                    break

            except WebSocketDisconnect:
                logger.info(f"알림 WebSocket 연결 종료: user_id={user_id}")
                break

    except Exception as e:
        logger.error(f"알림 WebSocket 오류 (user_id={user_id}): {e}")
    finally:
        await notification_manager.disconnect(websocket)
