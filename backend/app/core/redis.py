"""
Redis 연결 관리 모듈
비동기 Redis 클라이언트 팩토리 및 Pub/Sub 유틸리티
"""
import redis.asyncio as aioredis
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# 전역 Redis 클라이언트 인스턴스
_redis_client: Optional[aioredis.Redis] = None
_redis_pubsub: Optional[aioredis.client.PubSub] = None


async def get_redis_client() -> aioredis.Redis:
    """
    Redis 클라이언트 싱글톤 인스턴스 반환
    
    Returns:
        aioredis.Redis: 비동기 Redis 클라이언트
    """
    global _redis_client
    
    if _redis_client is None:
        try:
            _redis_client = aioredis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                decode_responses=True,  # 문자열로 자동 디코딩
                socket_connect_timeout=5,
                socket_keepalive=True,
            )
            # 연결 테스트
            await _redis_client.ping()
            logger.info(f"Redis 연결 성공: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        except Exception as e:
            logger.error(f"Redis 연결 실패: {e}")
            raise
    
    return _redis_client


async def get_redis_pubsub() -> aioredis.client.PubSub:
    """
    Redis Pub/Sub 클라이언트 인스턴스 반환
    
    Returns:
        aioredis.client.PubSub: 비동기 Pub/Sub 클라이언트
    """
    global _redis_pubsub
    
    if _redis_pubsub is None:
        client = await get_redis_client()
        _redis_pubsub = client.pubsub()
        logger.info("Redis Pub/Sub 클라이언트 생성 완료")
    
    return _redis_pubsub


async def close_redis_connections() -> None:
    """Redis 연결 종료"""
    global _redis_client, _redis_pubsub
    
    try:
        if _redis_pubsub:
            await _redis_pubsub.close()
            _redis_pubsub = None
            logger.info("Redis Pub/Sub 연결 종료")
        
        if _redis_client:
            await _redis_client.close()
            _redis_client = None
            logger.info("Redis 클라이언트 연결 종료")
    except Exception as e:
        logger.error(f"Redis 연결 종료 중 오류 발생: {e}")

