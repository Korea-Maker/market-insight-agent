"""
WebSocket 테스트 스크립트
FastAPI WebSocket 엔드포인트에 연결하여 실시간 데이터 수신 테스트
"""
import asyncio
import json
import logging
import websockets
from websockets.exceptions import ConnectionClosed

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# FastAPI WebSocket 엔드포인트 URL
WS_URL = "ws://localhost:8000/ws/prices"


async def test_websocket_connection() -> None:
    """
    WebSocket 연결 테스트 및 메시지 수신
    """
    try:
        logger.info(f"WebSocket 연결 시도: {WS_URL}")
        
        async with websockets.connect(WS_URL) as websocket:
            logger.info("✅ WebSocket 연결 성공!")
            logger.info("실시간 데이터 수신 대기 중... (Ctrl+C로 종료)\n")
            
            message_count = 0
            
            try:
                async for message in websocket:
                    try:
                        # JSON 메시지 파싱
                        data = json.loads(message)
                        message_count += 1
                        
                        # 데이터 출력
                        print(f"\n[{message_count}] 새로운 거래 데이터:")
                        print(f"  심볼: {data.get('symbol', 'N/A')}")
                        print(f"  가격: ${data.get('price', 0):,.2f}")
                        print(f"  수량: {data.get('quantity', 0):.8f}")
                        print(f"  타임스탬프: {data.get('timestamp', 0)}")
                        print(f"  거래 ID: {data.get('trade_id', 0)}")
                        print(f"  매수자 메이커: {data.get('is_buyer_maker', False)}")
                        
                        # 처음 10개 메시지만 상세 출력, 이후는 간단히
                        if message_count > 10:
                            print(f"\r총 {message_count}개 메시지 수신 중...", end="", flush=True)
                    
                    except json.JSONDecodeError as e:
                        logger.warning(f"JSON 파싱 실패: {e}, 메시지: {message[:100]}")
                        continue
                    except Exception as e:
                        logger.error(f"메시지 처리 오류: {e}")
                        continue
            
            except KeyboardInterrupt:
                logger.info(f"\n\n테스트 종료. 총 {message_count}개 메시지 수신됨.")
            except ConnectionClosed:
                logger.warning("서버가 연결을 종료했습니다.")
    
    except ConnectionRefusedError:
        logger.error("❌ 연결 실패: FastAPI 서버가 실행 중이지 않습니다.")
        logger.info("다음 명령어로 서버를 시작하세요: python main.py")
    except Exception as e:
        logger.error(f"❌ 연결 오류: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("QuantBoard V1 - WebSocket 테스트 스크립트")
    print("=" * 60)
    print()
    
    try:
        asyncio.run(test_websocket_connection())
    except KeyboardInterrupt:
        logger.info("\n테스트가 중단되었습니다.")

