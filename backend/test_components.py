"""
컴포넌트별 테스트 스크립트
각 컴포넌트를 개별적으로 테스트하여 문제를 진단
"""
import asyncio
import json
import logging
import sys
from typing import Optional

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def test_redis_connection() -> bool:
    """Redis 연결 테스트"""
    try:
        from app.core.redis import get_redis_client
        
        logger.info("Redis 연결 테스트 중...")
        client = await get_redis_client()
        result = await client.ping()
        
        if result:
            logger.info("✅ Redis 연결 성공!")
            return True
        else:
            logger.error("❌ Redis ping 실패")
            return False
    
    except Exception as e:
        logger.error(f"❌ Redis 연결 실패: {e}")
        logger.info("💡 해결 방법: Docker Compose로 Redis를 시작하세요")
        logger.info("   docker-compose up -d redis")
        return False


async def test_binance_connection() -> bool:
    """Binance WebSocket 연결 테스트"""
    try:
        import websockets
        
        logger.info("Binance WebSocket 연결 테스트 중...")
        url = "wss://stream.binance.com:9443/ws/btcusdt@trade"
        
        async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
            logger.info("✅ Binance WebSocket 연결 성공!")
            
            # 첫 메시지 수신 테스트
            try:
                message = await asyncio.wait_for(ws.recv(), timeout=5.0)
                data = json.loads(message)
                logger.info(f"✅ 데이터 수신 성공: {data.get('s', 'N/A')} @ ${float(data.get('p', 0)):,.2f}")
                return True
            except asyncio.TimeoutError:
                logger.warning("⚠️  메시지 수신 타임아웃 (연결은 성공)")
                return True
    
    except Exception as e:
        logger.error(f"❌ Binance WebSocket 연결 실패: {e}")
        return False


async def test_redis_pubsub() -> bool:
    """Redis Pub/Sub 테스트"""
    try:
        from app.core.redis import get_redis_client, get_redis_pubsub
        
        logger.info("Redis Pub/Sub 테스트 중...")
        
        # 클라이언트와 Pub/Sub 가져오기
        client = await get_redis_client()
        pubsub = await get_redis_pubsub()
        
        # 테스트 채널 구독
        test_channel = "test_channel"
        await pubsub.subscribe(test_channel)
        logger.info(f"✅ 채널 구독 성공: {test_channel}")
        
        # 테스트 메시지 발행
        test_message = {"test": "message", "timestamp": 1234567890}
        await client.publish(test_channel, json.dumps(test_message))
        logger.info("✅ 테스트 메시지 발행 완료")
        
        # 메시지 수신 테스트
        try:
            message = await asyncio.wait_for(
                pubsub.get_message(ignore_subscribe_messages=True),
                timeout=2.0
            )
            
            if message and message["type"] == "message":
                data = json.loads(message["data"])
                logger.info(f"✅ 메시지 수신 성공: {data}")
                await pubsub.unsubscribe(test_channel)
                return True
            else:
                logger.warning("⚠️  메시지 수신 실패")
                return False
        
        except asyncio.TimeoutError:
            logger.error("❌ 메시지 수신 타임아웃")
            await pubsub.unsubscribe(test_channel)
            return False
    
    except Exception as e:
        logger.error(f"❌ Redis Pub/Sub 테스트 실패: {e}")
        return False


async def test_fastapi_health() -> bool:
    """FastAPI 헬스 체크 테스트"""
    try:
        import aiohttp
        
        logger.info("FastAPI 헬스 체크 테스트 중...")
        url = "http://localhost:8000/health"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"✅ FastAPI 헬스 체크 성공: {data}")
                    return True
                else:
                    logger.error(f"❌ FastAPI 헬스 체크 실패: HTTP {response.status}")
                    return False
    
    except aiohttp.ClientConnectorError:
        logger.error("❌ FastAPI 서버에 연결할 수 없습니다")
        logger.info("💡 해결 방법: FastAPI 서버를 시작하세요")
        logger.info("   python main.py")
        return False
    except Exception as e:
        logger.error(f"❌ FastAPI 헬스 체크 실패: {e}")
        return False


async def run_all_tests() -> None:
    """모든 테스트 실행"""
    print("=" * 60)
    print("QuantBoard V1 - 컴포넌트 테스트")
    print("=" * 60)
    print()
    
    results = {}
    
    # 1. Redis 연결 테스트
    print("\n[1/4] Redis 연결 테스트")
    print("-" * 60)
    results["redis"] = await test_redis_connection()
    await asyncio.sleep(1)
    
    # 2. Binance WebSocket 테스트
    print("\n[2/4] Binance WebSocket 연결 테스트")
    print("-" * 60)
    results["binance"] = await test_binance_connection()
    await asyncio.sleep(1)
    
    # 3. Redis Pub/Sub 테스트 (Redis가 성공한 경우만)
    print("\n[3/4] Redis Pub/Sub 테스트")
    print("-" * 60)
    if results["redis"]:
        results["redis_pubsub"] = await test_redis_pubsub()
    else:
        logger.warning("⚠️  Redis 연결 실패로 Pub/Sub 테스트 건너뜀")
        results["redis_pubsub"] = False
    await asyncio.sleep(1)
    
    # 4. FastAPI 헬스 체크
    print("\n[4/4] FastAPI 헬스 체크")
    print("-" * 60)
    results["fastapi"] = await test_fastapi_health()
    
    # 결과 요약
    print("\n" + "=" * 60)
    print("테스트 결과 요약")
    print("=" * 60)
    
    for test_name, result in results.items():
        status = "✅ 통과" if result else "❌ 실패"
        print(f"  {test_name:20s}: {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ 모든 테스트 통과!")
        print("\n다음 단계: python test_listener.py 로 전체 파이프라인 테스트")
    else:
        print("❌ 일부 테스트 실패")
        print("\n💡 실패한 컴포넌트를 확인하고 문제를 해결하세요")
    print("=" * 60)


if __name__ == "__main__":
    try:
        asyncio.run(run_all_tests())
    except KeyboardInterrupt:
        logger.info("\n테스트가 중단되었습니다.")
        sys.exit(1)

