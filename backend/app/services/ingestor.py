"""
Binance WebSocket 데이터 수집 서비스
실시간 거래 데이터를 수신하여 Redis Pub/Sub으로 전송
"""
import asyncio
import json
import logging
from typing import Dict, Any
import websockets
from websockets.exceptions import ConnectionClosed, WebSocketException

from app.core.redis import get_redis_client
from app.core.config import settings

logger = logging.getLogger(__name__)

# Binance WebSocket URL
BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@trade"
REDIS_CHANNEL = "live_prices"


class BinanceIngestor:
    """Binance WebSocket 데이터 수집기"""
    
    def __init__(self) -> None:
        self.redis_client = None
        self.websocket = None
        self.running = False
    
    async def connect_redis(self) -> None:
        """Redis 클라이언트 연결"""
        try:
            self.redis_client = await get_redis_client()
            logger.info("Redis 클라이언트 연결 완료")
        except Exception as e:
            logger.error(f"Redis 연결 실패: {e}")
            raise
    
    async def connect_binance(self) -> None:
        """Binance WebSocket 연결"""
        try:
            self.websocket = await websockets.connect(
                BINANCE_WS_URL,
                ping_interval=20,
                ping_timeout=10,
            )
            logger.info(f"Binance WebSocket 연결 성공: {BINANCE_WS_URL}")
        except Exception as e:
            logger.error(f"Binance WebSocket 연결 실패: {e}")
            raise
    
    async def parse_trade_data(self, raw_data: str) -> Dict[str, Any]:
        """
        Binance 거래 데이터 파싱 및 정규화
        
        Args:
            raw_data: Binance WebSocket에서 받은 JSON 문자열
            
        Returns:
            정규화된 거래 데이터 딕셔너리
        """
        try:
            data = json.loads(raw_data)
            
            # Binance trade 스트림 형식:
            # {
            #   "e": "trade",
            #   "E": 123456789,
            #   "s": "BTCUSDT",
            #   "t": 12345,
            #   "p": "0.001",
            #   "q": "100",
            #   "b": 88,
            #   "a": 50,
            #   "T": 123456785,
            #   "m": true,
            #   "M": true
            # }
            
            normalized = {
                "symbol": data.get("s", "BTCUSDT"),
                "price": float(data.get("p", 0)),
                "quantity": float(data.get("q", 0)),
                "timestamp": data.get("E", 0),
                "trade_id": data.get("t", 0),
                "is_buyer_maker": data.get("m", False),
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
        Redis 채널에 데이터 발행
        
        Args:
            data: 발행할 데이터 딕셔너리
        """
        if not self.redis_client:
            raise RuntimeError("Redis 클라이언트가 연결되지 않았습니다")
        
        try:
            message = json.dumps(data)
            await self.redis_client.publish(REDIS_CHANNEL, message)
        except Exception as e:
            logger.error(f"Redis 발행 오류: {e}")
            raise
    
    async def start(self) -> None:
        """수집기 시작"""
        if self.running:
            logger.warning("수집기가 이미 실행 중입니다")
            return
        
        try:
            await self.connect_redis()
            await self.connect_binance()
            
            self.running = True
            logger.info("Binance 데이터 수집기 시작")
            
            # 메시지 수신 루프
            async for message in self.websocket:
                if not self.running:
                    break
                
                try:
                    # 데이터 파싱
                    normalized_data = await self.parse_trade_data(message)
                    
                    # Redis에 발행
                    await self.publish_to_redis(normalized_data)
                    
                    logger.debug(f"데이터 처리 완료: {normalized_data['symbol']} @ {normalized_data['price']}")
                    
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
        
        # Redis 클라이언트는 전역 관리되므로 여기서 닫지 않음


async def run_ingestor() -> None:
    """수집기 실행 함수 (백그라운드 태스크용)"""
    ingestor = BinanceIngestor()
    
    # 재연결 로직 포함
    max_retries = 5
    retry_delay = 5  # 초
    
    for attempt in range(max_retries):
        try:
            await ingestor.start()
            # 정상 종료 시 루프 종료
            break
        except Exception as e:
            logger.error(f"수집기 실행 실패 (시도 {attempt + 1}/{max_retries}): {e}")
            
            if attempt < max_retries - 1:
                logger.info(f"{retry_delay}초 후 재시도...")
                await asyncio.sleep(retry_delay)
            else:
                logger.error("최대 재시도 횟수 초과. 수집기를 종료합니다.")
                raise


if __name__ == "__main__":
    # 로깅 설정
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    
    # 직접 실행 시
    asyncio.run(run_ingestor())

