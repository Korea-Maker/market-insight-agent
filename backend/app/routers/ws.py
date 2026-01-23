"""
WebSocket 라우터 모듈
클라이언트와의 실시간 통신을 위한 WebSocket 엔드포인트
"""
import asyncio
import json
import logging
from typing import Set, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect, APIRouter

from app.core.redis import get_redis_pubsub, REDIS_ENABLED

logger = logging.getLogger(__name__)

router = APIRouter()

# Redis 채널명
REDIS_CHANNEL = "live_prices"


class ConnectionManager:
    """WebSocket 연결 관리자"""
    
    def __init__(self) -> None:
        # 활성 WebSocket 연결 집합
        self.active_connections: Set[WebSocket] = set()
        # Redis Pub/Sub 구독 태스크
        self.subscribe_task: asyncio.Task | None = None
        self.running = False
    
    async def connect(self, websocket: WebSocket) -> None:
        """
        클라이언트 연결 수락 및 등록
        
        Args:
            websocket: FastAPI WebSocket 인스턴스
        """
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"클라이언트 연결됨. 총 연결 수: {len(self.active_connections)}")
        
        # 첫 연결 시 Redis 구독 시작
        if not self.running:
            await self.start_redis_subscription()
    
    async def disconnect(self, websocket: WebSocket) -> None:
        """
        클라이언트 연결 해제
        
        Args:
            websocket: 해제할 WebSocket 인스턴스
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"클라이언트 연결 해제됨. 총 연결 수: {len(self.active_connections)}")
        
        # 모든 연결이 종료되면 Redis 구독 중지
        if len(self.active_connections) == 0:
            await self.stop_redis_subscription()
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket) -> None:
        """
        특정 클라이언트에게 메시지 전송
        
        Args:
            message: 전송할 메시지 딕셔너리
            websocket: 대상 WebSocket 인스턴스
        """
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"개인 메시지 전송 실패: {e}")
            await self.disconnect(websocket)
    
    async def broadcast(self, message: Dict[str, Any]) -> None:
        """
        모든 연결된 클라이언트에게 메시지 브로드캐스트
        
        Args:
            message: 브로드캐스트할 메시지 딕셔너리
        """
        if not self.active_connections:
            return
        
        # 연결이 끊어진 소켓을 추적
        disconnected: Set[WebSocket] = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"브로드캐스트 실패 (연결 해제 예정): {e}")
                disconnected.add(connection)
        
        # 끊어진 연결 제거
        for connection in disconnected:
            await self.disconnect(connection)
    
    async def start_redis_subscription(self) -> None:
        """Redis 채널 구독 시작"""
        if self.running:
            return

        try:
            self.running = True
            pubsub = await get_redis_pubsub()

            # Redis 비활성화 시 조기 종료
            if pubsub is None:
                logger.warning("Redis 비활성화됨 - 실시간 가격 스트리밍 불가")
                self.running = False
                return

            await pubsub.subscribe(REDIS_CHANNEL)
            logger.info(f"Redis 채널 구독 시작: {REDIS_CHANNEL}")

            # 백그라운드 태스크로 메시지 수신 루프 시작
            self.subscribe_task = asyncio.create_task(self._redis_message_loop(pubsub))
        except Exception as e:
            logger.error(f"Redis 구독 시작 실패: {e}")
            self.running = False
            raise
    
    async def stop_redis_subscription(self) -> None:
        """Redis 채널 구독 중지"""
        if not self.running:
            return
        
        try:
            self.running = False
            
            if self.subscribe_task:
                self.subscribe_task.cancel()
                try:
                    await self.subscribe_task
                except asyncio.CancelledError:
                    pass
                self.subscribe_task = None
            
            pubsub = await get_redis_pubsub()
            await pubsub.unsubscribe(REDIS_CHANNEL)
            logger.info(f"Redis 채널 구독 중지: {REDIS_CHANNEL}")
        except Exception as e:
            logger.error(f"Redis 구독 중지 실패: {e}")
    
    async def _redis_message_loop(self, pubsub: Any) -> None:
        """
        Redis 메시지 수신 루프 (백그라운드 태스크)
        
        Args:
            pubsub: Redis Pub/Sub 클라이언트
        """
        try:
            while self.running:
                try:
                    # 메시지 수신 (타임아웃 1초)
                    message = await asyncio.wait_for(
                        pubsub.get_message(ignore_subscribe_messages=True),
                        timeout=1.0
                    )
                    
                    if message and message["type"] == "message":
                        # JSON 파싱
                        try:
                            data = json.loads(message["data"])
                            # 모든 클라이언트에게 브로드캐스트
                            await self.broadcast(data)
                        except json.JSONDecodeError as e:
                            logger.error(f"Redis 메시지 JSON 파싱 실패: {e}")
                            continue
                
                except asyncio.TimeoutError:
                    # 타임아웃은 정상 (주기적 체크)
                    continue
                except Exception as e:
                    logger.error(f"Redis 메시지 수신 중 오류: {e}")
                    await asyncio.sleep(1)  # 오류 시 잠시 대기
        
        except asyncio.CancelledError:
            logger.info("Redis 메시지 루프 취소됨")
        except Exception as e:
            logger.error(f"Redis 메시지 루프 오류: {e}")
            self.running = False


# 전역 ConnectionManager 인스턴스
manager = ConnectionManager()


@router.websocket("/ws/prices")
async def websocket_prices(websocket: WebSocket) -> None:
    """
    실시간 가격 데이터 WebSocket 엔드포인트

    클라이언트가 연결되면 Redis의 live_prices 채널에서
    실시간 거래 데이터를 수신하여 브로드캐스트합니다.
    """
    # Redis 비활성화 시 연결 거부 및 상태 전송
    if not REDIS_ENABLED:
        await websocket.accept()
        await websocket.send_json({
            "type": "error",
            "code": "REDIS_DISABLED",
            "message": "실시간 가격 스트리밍이 비활성화되어 있습니다. REDIS_ENABLED=true로 설정하세요."
        })
        await websocket.close(code=1000, reason="Redis disabled")
        return

    await manager.connect(websocket)

    try:
        # 연결 유지 및 클라이언트 메시지 수신 대기
        # 서버에서 클라이언트로만 데이터를 전송하므로,
        # 클라이언트 메시지는 선택적으로 처리합니다.
        while True:
            try:
                # 클라이언트로부터 메시지 수신 (ping/pong 등)
                # 타임아웃을 사용하여 주기적으로 연결 상태 확인
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0  # 30초마다 연결 상태 확인
                )
                logger.debug(f"클라이언트 메시지 수신: {data}")
                
                # 필요 시 응답 처리 (현재는 단순 수신만)
                # 예: {"type": "ping"} -> {"type": "pong"}
                
            except asyncio.TimeoutError:
                # 타임아웃은 정상 (연결 유지 확인용)
                continue
            except WebSocketDisconnect:
                logger.info("클라이언트가 연결을 종료했습니다")
                break
    
    except Exception as e:
        logger.error(f"WebSocket 처리 중 오류: {e}")
    finally:
        await manager.disconnect(websocket)

