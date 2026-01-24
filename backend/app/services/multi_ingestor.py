"""
다중 심볼 Binance WebSocket 데이터 수집 서비스
Combined Stream을 사용하여 단일 연결로 다중 심볼 실시간 데이터 수집
"""
import asyncio
import json
import logging
from typing import Dict, Any, Set, Optional
from enum import Enum
import websockets
from websockets.exceptions import ConnectionClosed, WebSocketException

from app.core.redis import get_redis_client
from app.core.config import settings

logger = logging.getLogger(__name__)


class StreamType(Enum):
    """Binance 스트림 유형"""
    TRADE = "trade"
    TICKER = "ticker"
    MINI_TICKER = "miniTicker"


class MultiSymbolIngestor:
    """다중 심볼 Binance WebSocket 수집기"""

    def __init__(
        self,
        symbols: Optional[Set[str]] = None,
        stream_type: StreamType = StreamType.TRADE,
        redis_channel_prefix: str = "prices"
    ) -> None:
        """
        Args:
            symbols: 초기 구독 심볼 집합 (예: {"BTCUSDT", "ETHUSDT"})
            stream_type: 스트림 유형 (trade, ticker, miniTicker)
            redis_channel_prefix: Redis 채널 접두사
        """
        self.symbols: Set[str] = symbols or set(settings.DEFAULT_SYMBOLS)
        self.stream_type = stream_type
        self.redis_channel_prefix = redis_channel_prefix
        self.redis_client = None
        self.websocket = None
        self.running = False
        self._reconnect_lock = asyncio.Lock()

    def _build_stream_url(self) -> str:
        """Combined Stream URL 생성"""
        if not self.symbols:
            raise ValueError("구독할 심볼이 없습니다")

        streams = "/".join([
            f"{symbol.lower()}@{self.stream_type.value}"
            for symbol in self.symbols
        ])
        return f"{settings.BINANCE_WS_BASE}/stream?streams={streams}"

    async def connect_redis(self) -> None:
        """Redis 클라이언트 연결"""
        try:
            self.redis_client = await get_redis_client()
            logger.info("Redis 클라이언트 연결 완료")
        except Exception as e:
            logger.error(f"Redis 연결 실패: {e}")
            raise

    async def connect_binance(self) -> None:
        """Binance Combined Stream WebSocket 연결"""
        url = self._build_stream_url()
        try:
            self.websocket = await websockets.connect(
                url,
                ping_interval=20,
                ping_timeout=10,
            )
            logger.info(f"Binance Combined Stream 연결 성공: {len(self.symbols)}개 심볼")
            logger.debug(f"URL: {url}")
        except Exception as e:
            logger.error(f"Binance WebSocket 연결 실패: {e}")
            raise

    async def add_symbols(self, symbols: Set[str]) -> Set[str]:
        """
        심볼 동적 추가 (WebSocket 재연결 필요)

        Args:
            symbols: 추가할 심볼 집합

        Returns:
            현재 활성 심볼 집합
        """
        async with self._reconnect_lock:
            new_symbols = symbols - self.symbols
            if not new_symbols:
                return self.symbols

            self.symbols.update(new_symbols)
            logger.info(f"심볼 추가됨: {new_symbols}")

            # 실행 중이면 재연결
            if self.running and self.websocket:
                await self._reconnect()

            return self.symbols

    async def remove_symbols(self, symbols: Set[str]) -> Set[str]:
        """
        심볼 동적 제거

        Args:
            symbols: 제거할 심볼 집합

        Returns:
            현재 활성 심볼 집합
        """
        async with self._reconnect_lock:
            removed = symbols & self.symbols
            if not removed:
                return self.symbols

            self.symbols -= removed
            logger.info(f"심볼 제거됨: {removed}")

            # 실행 중이고 심볼이 남아있으면 재연결
            if self.running and self.websocket and self.symbols:
                await self._reconnect()
            elif not self.symbols:
                logger.warning("모든 심볼이 제거됨. 수집기 중지")
                await self.stop()

            return self.symbols

    async def _reconnect(self) -> None:
        """WebSocket 재연결 (심볼 변경 시)"""
        logger.info("심볼 변경으로 인한 WebSocket 재연결...")
        if self.websocket:
            await self.websocket.close()
        await self.connect_binance()

    async def get_active_symbols(self) -> Set[str]:
        """현재 활성 심볼 목록 조회"""
        return self.symbols.copy()

    async def parse_combined_stream_data(self, raw_data: str) -> Dict[str, Any]:
        """
        Combined Stream 메시지 파싱

        Args:
            raw_data: Combined Stream에서 받은 JSON 문자열

        Returns:
            정규화된 거래 데이터 딕셔너리
        """
        try:
            data = json.loads(raw_data)

            # Combined Stream 형식:
            # {
            #   "stream": "btcusdt@trade",
            #   "data": { ... trade data ... }
            # }
            stream_name = data.get("stream", "")
            trade_data = data.get("data", {})

            if not trade_data:
                logger.warning(f"빈 데이터 수신: {raw_data[:100]}")
                return {}

            normalized = {
                "symbol": trade_data.get("s", "UNKNOWN"),
                "price": float(trade_data.get("p", 0)),
                "quantity": float(trade_data.get("q", 0)),
                "timestamp": trade_data.get("E", 0),
                "trade_id": trade_data.get("t", 0),
                "is_buyer_maker": trade_data.get("m", False),
                "stream": stream_name,
            }

            return normalized
        except json.JSONDecodeError as e:
            logger.error(f"JSON 파싱 오류: {e}, 데이터: {raw_data[:100]}")
            raise
        except Exception as e:
            logger.error(f"데이터 정규화 오류: {e}")
            raise

    async def publish_to_redis(self, data: Dict[str, Any]) -> None:
        """
        심볼별 Redis 채널에 데이터 발행

        Args:
            data: 발행할 데이터 딕셔너리
        """
        if not self.redis_client:
            raise RuntimeError("Redis 클라이언트가 연결되지 않았습니다")

        try:
            symbol = data.get("symbol", "UNKNOWN")
            channel = f"{self.redis_channel_prefix}:{symbol}"
            message = json.dumps(data)
            await self.redis_client.publish(channel, message)

            # 통합 채널에도 발행 (모든 심볼 구독자용)
            all_channel = f"{self.redis_channel_prefix}:all"
            await self.redis_client.publish(all_channel, message)
        except Exception as e:
            logger.error(f"Redis 발행 오류: {e}")
            raise

    async def start(self) -> None:
        """수집기 시작"""
        if self.running:
            logger.warning("수집기가 이미 실행 중입니다")
            return

        if not self.symbols:
            logger.error("구독할 심볼이 없습니다")
            return

        try:
            await self.connect_redis()
            await self.connect_binance()

            self.running = True
            logger.info(f"다중 심볼 수집기 시작: {self.symbols}")

            # 메시지 수신 루프
            async for message in self.websocket:
                if not self.running:
                    break

                try:
                    normalized_data = await self.parse_combined_stream_data(message)

                    if normalized_data:
                        await self.publish_to_redis(normalized_data)
                        logger.debug(
                            f"데이터 처리: {normalized_data['symbol']} @ {normalized_data['price']}"
                        )

                except Exception as e:
                    logger.error(f"메시지 처리 오류: {e}")
                    continue

        except ConnectionClosed:
            logger.warning("Binance WebSocket 연결이 종료되었습니다")
        except WebSocketException as e:
            logger.error(f"WebSocket 예외 발생: {e}")
        except Exception as e:
            logger.error(f"수집기 실행 중 오류 발생: {e}")
        finally:
            await self.stop()

    async def stop(self) -> None:
        """수집기 중지"""
        self.running = False

        try:
            if self.websocket:
                await self.websocket.close()
                logger.info("Binance WebSocket 연결 종료")
        except Exception as e:
            logger.error(f"WebSocket 종료 중 오류: {e}")


async def run_multi_ingestor(symbols: Optional[Set[str]] = None) -> None:
    """
    다중 심볼 수집기 실행 함수 (백그라운드 태스크용)

    Args:
        symbols: 구독할 심볼 집합 (None이면 기본값 사용)
    """
    ingestor = MultiSymbolIngestor(symbols=symbols)

    max_retries = 5
    retry_delay = 5

    for attempt in range(max_retries):
        try:
            await ingestor.start()
            break
        except Exception as e:
            logger.error(f"수집기 실행 실패 (시도 {attempt + 1}/{max_retries}): {e}")

            if attempt < max_retries - 1:
                logger.info(f"{retry_delay}초 후 재시도...")
                await asyncio.sleep(retry_delay)
            else:
                logger.error("최대 재시도 횟수 초과. 수집기를 종료합니다.")
                raise


# 전역 수집기 인스턴스 (싱글톤)
_ingestor_instance: Optional[MultiSymbolIngestor] = None


async def get_ingestor() -> MultiSymbolIngestor:
    """전역 수집기 인스턴스 반환"""
    global _ingestor_instance
    if _ingestor_instance is None:
        _ingestor_instance = MultiSymbolIngestor()
    return _ingestor_instance


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    asyncio.run(run_multi_ingestor())
