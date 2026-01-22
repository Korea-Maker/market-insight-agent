"""
QuantBoard V1 - FastAPI 백엔드 진입점
"""
import asyncio
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db, close_db
from app.routers import ws, candles, news, auth, users, posts, comments, sources, analysis

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Redis 사용 여부 (환경변수로 제어, 기본: 비활성화)
REDIS_ENABLED = os.getenv("REDIS_ENABLED", "false").lower() == "true"


async def check_redis_connection() -> bool:
    """Redis 연결 가능 여부 확인"""
    try:
        from app.core.redis import get_redis_client
        client = await get_redis_client()
        await client.ping()
        return True
    except Exception as e:
        logger.warning(f"Redis 연결 불가: {e}")
        return False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 생명주기 관리자 (시작/종료 이벤트 처리)
    - 시작 시: DB 초기화, 선택적으로 Binance/뉴스 수집기 시작
    - 종료 시: 모든 리소스 정리
    """
    # 시작 시 실행할 코드
    logger.info("애플리케이션 시작 중...")

    # 데이터베이스 초기화 (테이블 생성)
    await init_db()

    # 백그라운드 태스크 추적
    background_tasks = []
    redis_available = False

    # Redis 연결 확인 및 관련 서비스 시작
    if REDIS_ENABLED:
        redis_available = await check_redis_connection()
        if redis_available:
            from app.services.ingestor import run_ingestor
            ingestor_task = asyncio.create_task(run_ingestor())
            background_tasks.append(("Binance 데이터 수집기", ingestor_task))
            logger.info("Binance 데이터 수집기 백그라운드 태스크 시작됨")
        else:
            logger.warning("Redis 비활성화 - 실시간 가격 스트리밍 사용 불가")
    else:
        logger.info("Redis 비활성화됨 (REDIS_ENABLED=false)")

    # 뉴스 수집기 시작 (DB만 필요, Redis 불필요)
    from app.services.news_collector import run_news_collector, ensure_default_sources

    # 기본 RSS 소스 마이그레이션 (데이터베이스에 추가)
    await ensure_default_sources()
    logger.info("기본 RSS 소스 마이그레이션 완료")

    news_collector_task = asyncio.create_task(run_news_collector())
    background_tasks.append(("뉴스 수집기", news_collector_task))
    logger.info("뉴스 수집기 백그라운드 태스크 시작됨")

    yield

    # 종료 시 실행할 코드
    logger.info("애플리케이션 종료 중...")

    # 모든 백그라운드 태스크 취소
    for name, task in background_tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            logger.info(f"{name} 태스크 취소됨")

    # 데이터베이스 연결 종료
    await close_db()

    # Redis 연결 종료 (사용 중인 경우)
    if redis_available:
        from app.core.redis import close_redis_connections
        await close_redis_connections()

    logger.info("애플리케이션 종료 완료")


app = FastAPI(
    title="QuantBoard API",
    description="고성능 실시간 트레이딩 대시보드 API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(ws.router)
app.include_router(candles.router)
app.include_router(news.router)
app.include_router(sources.router)
app.include_router(analysis.router)

# 커뮤니티 라우터
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(comments.router)


@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy", "service": "QuantBoard API"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.ENVIRONMENT == "development",
    )

