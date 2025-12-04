"""
QuantBoard V1 - FastAPI 백엔드 진입점
"""
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.redis import close_redis_connections
from app.services.ingestor import run_ingestor
from app.routers import ws

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 생명주기 관리자 (시작/종료 이벤트 처리)
    - 시작 시: Binance 데이터 수집기 백그라운드 태스크 시작
    - 종료 시: 모든 리소스 정리
    """
    # 시작 시 실행할 코드
    logger.info("애플리케이션 시작 중...")
    
    # Binance 데이터 수집기 백그라운드 태스크 시작
    ingestor_task = asyncio.create_task(run_ingestor())
    logger.info("Binance 데이터 수집기 백그라운드 태스크 시작됨")
    
    yield
    
    # 종료 시 실행할 코드
    logger.info("애플리케이션 종료 중...")
    
    # 수집기 태스크 취소
    ingestor_task.cancel()
    try:
        await ingestor_task
    except asyncio.CancelledError:
        logger.info("Binance 데이터 수집기 태스크 취소됨")
    
    # Redis 연결 종료
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
app.include_router(ws.router, tags=["WebSocket"])


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

