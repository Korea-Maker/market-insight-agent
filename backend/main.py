"""
QuantBoard V1 - FastAPI 백엔드 진입점
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager

from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 생명주기 관리자 (시작/종료 이벤트 처리)"""
    # 시작 시 실행할 코드
    yield
    # 종료 시 실행할 코드


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

