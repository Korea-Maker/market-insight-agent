"""
WebSocket 라우터 모듈
다중 심볼 실시간 통신을 위한 WebSocket 엔드포인트
"""
import asyncio
import json
import logging
from typing import Set, Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Query

from app.core.redis import get_redis_pubsub, REDIS_ENABLED
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class MultiSymbolConnectionManager:
    """다중 심볼 WebSocket 연결 관리자"""

    def __init__(self) -> None:
        # 클라이언트별 구독 심볼 추적
        self.client_subscriptions: Dict[WebSocket, Set[str]] = {}
        # 심볼별 구독 클라이언트 추적 (역인덱스)
        self.symbol_subscribers: Dict[str, Set[WebSocket]] = {}
        # 심볼별 Redis 구독 태스크
        self.redis_tasks: Dict[str, asyncio.Task] = {}
        self.running = False
        self._lock = asyncio.Lock()

    async def connect(
        self,
        websocket: WebSocket,
        initial_symbols: Optional[Set[str]] = None
    ) -> None:
        """
        클라이언트 연결 수락 및 등록

        Args:
            websocket: FastAPI WebSocket 인스턴스
            initial_symbols: 초기 구독 심볼 (없으면 기본값 사용)
        """
        await websocket.accept()

        symbols = initial_symbols or set(settings.DEFAULT_SYMBOLS)
        self.client_subscriptions[websocket] = set()

        logger.info(f"클라이언트 연결됨. 총 연결 수: {len(self.client_subscriptions)}")

        # 초기 심볼 구독
        await self.subscribe(websocket, symbols)

    async def disconnect(self, websocket: WebSocket) -> None:
        """
        클라이언트 연결 해제

        Args:
            websocket: 해제할 WebSocket 인스턴스
        """
        async with self._lock:
            if websocket not in self.client_subscriptions:
                return

            # 클라이언트의 모든 심볼 구독 해제
            subscribed_symbols = self.client_subscriptions.get(websocket, set()).copy()
            for symbol in subscribed_symbols:
                await self._remove_subscriber(websocket, symbol)

            del self.client_subscriptions[websocket]
            logger.info(f"클라이언트 연결 해제됨. 총 연결 수: {len(self.client_subscriptions)}")

    async def subscribe(
        self,
        websocket: WebSocket,
        symbols: Set[str]
    ) -> Set[str]:
        """
        클라이언트를 심볼에 구독

        Args:
            websocket: WebSocket 인스턴스
            symbols: 구독할 심볼 집합

        Returns:
            실제로 구독된 심볼 집합
        """
        async with self._lock:
            if websocket not in self.client_subscriptions:
                return set()

            # 최대 구독 수 체크
            current = len(self.client_subscriptions[websocket])
            available = settings.MAX_SYMBOLS_PER_CLIENT - current
            symbols_to_add = set(list(symbols)[:available])

            for symbol in symbols_to_add:
                await self._add_subscriber(websocket, symbol)

            return symbols_to_add

    async def unsubscribe(
        self,
        websocket: WebSocket,
        symbols: Set[str]
    ) -> Set[str]:
        """
        클라이언트 구독 해제

        Args:
            websocket: WebSocket 인스턴스
            symbols: 구독 해제할 심볼 집합

        Returns:
            실제로 해제된 심볼 집합
        """
        async with self._lock:
            if websocket not in self.client_subscriptions:
                return set()

            unsubscribed = set()
            for symbol in symbols:
                if symbol in self.client_subscriptions[websocket]:
                    await self._remove_subscriber(websocket, symbol)
                    unsubscribed.add(symbol)

            return unsubscribed

    async def _add_subscriber(self, websocket: WebSocket, symbol: str) -> None:
        """심볼에 구독자 추가 (내부 메서드)"""
        # 클라이언트 구독 목록에 추가
        self.client_subscriptions[websocket].add(symbol)

        # 심볼 구독자 목록에 추가
        if symbol not in self.symbol_subscribers:
            self.symbol_subscribers[symbol] = set()
        self.symbol_subscribers[symbol].add(websocket)

        # 첫 구독자면 Redis 구독 시작
        if len(self.symbol_subscribers[symbol]) == 1:
            await self._start_redis_subscription(symbol)

        logger.debug(f"심볼 구독 추가: {symbol}, 구독자 수: {len(self.symbol_subscribers[symbol])}")

    async def _remove_subscriber(self, websocket: WebSocket, symbol: str) -> None:
        """심볼에서 구독자 제거 (내부 메서드)"""
        # 클라이언트 구독 목록에서 제거
        if websocket in self.client_subscriptions:
            self.client_subscriptions[websocket].discard(symbol)

        # 심볼 구독자 목록에서 제거
        if symbol in self.symbol_subscribers:
            self.symbol_subscribers[symbol].discard(websocket)

            # 마지막 구독자가 제거되면 Redis 구독 중지
            if len(self.symbol_subscribers[symbol]) == 0:
                await self._stop_redis_subscription(symbol)
                del self.symbol_subscribers[symbol]

    async def _start_redis_subscription(self, symbol: str) -> None:
        """심볼별 Redis 채널 구독 시작"""
        if symbol in self.redis_tasks:
            return

        try:
            pubsub = await get_redis_pubsub()
            if pubsub is None:
                logger.warning(f"Redis 비활성화됨 - {symbol} 구독 불가")
                return

            channel = f"{settings.REDIS_CHANNEL_PREFIX}:{symbol}"
            await pubsub.subscribe(channel)
            logger.info(f"Redis 채널 구독 시작: {channel}")

            # 백그라운드 태스크로 메시지 수신
            task = asyncio.create_task(self._redis_message_loop(pubsub, symbol))
            self.redis_tasks[symbol] = task

        except Exception as e:
            logger.error(f"Redis 구독 시작 실패 ({symbol}): {e}")

    async def _stop_redis_subscription(self, symbol: str) -> None:
        """심볼별 Redis 채널 구독 중지"""
        if symbol not in self.redis_tasks:
            return

        try:
            task = self.redis_tasks.pop(symbol)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

            pubsub = await get_redis_pubsub()
            if pubsub:
                channel = f"{settings.REDIS_CHANNEL_PREFIX}:{symbol}"
                await pubsub.unsubscribe(channel)
                logger.info(f"Redis 채널 구독 중지: {channel}")

        except Exception as e:
            logger.error(f"Redis 구독 중지 실패 ({symbol}): {e}")

    async def _redis_message_loop(self, pubsub: Any, symbol: str) -> None:
        """Redis 메시지 수신 루프"""
        try:
            while symbol in self.redis_tasks:
                try:
                    message = await asyncio.wait_for(
                        pubsub.get_message(ignore_subscribe_messages=True),
                        timeout=1.0
                    )

                    if message and message["type"] == "message":
                        try:
                            data = json.loads(message["data"])
                            await self.broadcast_to_symbol(symbol, data)
                        except json.JSONDecodeError as e:
                            logger.error(f"Redis 메시지 JSON 파싱 실패: {e}")
                            continue

                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.error(f"Redis 메시지 수신 중 오류 ({symbol}): {e}")
                    await asyncio.sleep(1)

        except asyncio.CancelledError:
            logger.info(f"Redis 메시지 루프 취소됨: {symbol}")
        except Exception as e:
            logger.error(f"Redis 메시지 루프 오류 ({symbol}): {e}")

    async def broadcast_to_symbol(
        self,
        symbol: str,
        message: Dict[str, Any]
    ) -> None:
        """
        특정 심볼 구독자에게만 브로드캐스트

        Args:
            symbol: 심볼명
            message: 전송할 메시지
        """
        if symbol not in self.symbol_subscribers:
            return

        # 메시지에 type 필드 추가
        message["type"] = "price"

        disconnected: Set[WebSocket] = set()

        for websocket in self.symbol_subscribers[symbol]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.warning(f"메시지 전송 실패: {e}")
                disconnected.add(websocket)

        # 끊어진 연결 제거
        for websocket in disconnected:
            await self.disconnect(websocket)

    async def send_to_client(
        self,
        websocket: WebSocket,
        message: Dict[str, Any]
    ) -> None:
        """특정 클라이언트에게 메시지 전송"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"클라이언트 메시지 전송 실패: {e}")
            await self.disconnect(websocket)

    def get_client_subscriptions(self, websocket: WebSocket) -> Set[str]:
        """클라이언트의 현재 구독 심볼 목록 반환"""
        return self.client_subscriptions.get(websocket, set()).copy()


# 전역 ConnectionManager 인스턴스
manager = MultiSymbolConnectionManager()


@router.websocket("/ws/prices")
async def websocket_prices(
    websocket: WebSocket,
    symbols: Optional[str] = Query(default=None)
) -> None:
    """
    다중 심볼 실시간 가격 데이터 WebSocket 엔드포인트

    Query params:
        symbols: 쉼표로 구분된 심볼 목록 (선택, 기본값: DEFAULT_SYMBOLS)

    Client messages:
        {"type": "subscribe", "symbols": ["ETHUSDT", "BNBUSDT"]}
        {"type": "unsubscribe", "symbols": ["BNBUSDT"]}

    Server messages:
        {"type": "price", "symbol": "BTCUSDT", "price": 50000, ...}
        {"type": "subscribed", "symbols": ["BTCUSDT", "ETHUSDT"]}
        {"type": "unsubscribed", "symbols": ["BNBUSDT"]}
        {"type": "error", "code": "...", "message": "..."}
    """
    # Redis 비활성화 시 연결 거부
    if not REDIS_ENABLED:
        await websocket.accept()
        await websocket.send_json({
            "type": "error",
            "code": "REDIS_DISABLED",
            "message": "실시간 가격 스트리밍이 비활성화되어 있습니다. REDIS_ENABLED=true로 설정하세요."
        })
        await websocket.close(code=1000, reason="Redis disabled")
        return

    # 초기 심볼 파싱
    initial_symbols: Optional[Set[str]] = None
    if symbols:
        initial_symbols = set(s.strip().upper() for s in symbols.split(",") if s.strip())

    await manager.connect(websocket, initial_symbols)

    # 현재 구독 상태 전송
    subscribed = manager.get_client_subscriptions(websocket)
    await manager.send_to_client(websocket, {
        "type": "subscribed",
        "symbols": list(subscribed)
    })

    try:
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0
                )

                # 클라이언트 메시지 처리
                try:
                    message = json.loads(data)
                    await _handle_client_message(websocket, message)
                except json.JSONDecodeError:
                    await manager.send_to_client(websocket, {
                        "type": "error",
                        "code": "INVALID_JSON",
                        "message": "잘못된 JSON 형식입니다"
                    })

            except asyncio.TimeoutError:
                continue
            except WebSocketDisconnect:
                logger.info("클라이언트가 연결을 종료했습니다")
                break

    except Exception as e:
        logger.error(f"WebSocket 처리 중 오류: {e}")
    finally:
        await manager.disconnect(websocket)


async def _handle_client_message(websocket: WebSocket, message: Dict[str, Any]) -> None:
    """클라이언트 메시지 처리"""
    msg_type = message.get("type")

    if msg_type == "subscribe":
        symbols = message.get("symbols", [])
        if not isinstance(symbols, list):
            await manager.send_to_client(websocket, {
                "type": "error",
                "code": "INVALID_SYMBOLS",
                "message": "symbols는 배열이어야 합니다"
            })
            return

        symbols_set = set(s.strip().upper() for s in symbols if isinstance(s, str))
        subscribed = await manager.subscribe(websocket, symbols_set)

        await manager.send_to_client(websocket, {
            "type": "subscribed",
            "symbols": list(subscribed)
        })

    elif msg_type == "unsubscribe":
        symbols = message.get("symbols", [])
        if not isinstance(symbols, list):
            await manager.send_to_client(websocket, {
                "type": "error",
                "code": "INVALID_SYMBOLS",
                "message": "symbols는 배열이어야 합니다"
            })
            return

        symbols_set = set(s.strip().upper() for s in symbols if isinstance(s, str))
        unsubscribed = await manager.unsubscribe(websocket, symbols_set)

        await manager.send_to_client(websocket, {
            "type": "unsubscribed",
            "symbols": list(unsubscribed)
        })

    elif msg_type == "ping":
        await manager.send_to_client(websocket, {"type": "pong"})

    else:
        logger.debug(f"알 수 없는 메시지 유형: {msg_type}")
