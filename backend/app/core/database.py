"""
데이터베이스 연결 및 세션 관리
SQLAlchemy 2.0 비동기 패턴 사용
SQLite (기본) 또는 PostgreSQL 지원
"""
import logging
import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import declarative_base

from app.core.config import settings

logger = logging.getLogger(__name__)

# SQLAlchemy Base 클래스
Base = declarative_base()

# 데이터베이스 URL 구성 (SQLite 기본, PostgreSQL 선택적)
def get_database_url() -> str:
    """환경에 따른 데이터베이스 URL 반환"""
    db_type = os.getenv("DB_TYPE", "sqlite").lower()

    if db_type == "postgresql":
        return (
            f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
            f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
        )
    else:
        # SQLite 기본 (backend/data/quantboard.db)
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "quantboard.db")
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        return f"sqlite+aiosqlite:///{db_path}"

DATABASE_URL = get_database_url()
logger.info(f"Using database: {DATABASE_URL.split('://')[0]}")

# 비동기 엔진 생성 (SQLite와 PostgreSQL 모두 지원)
engine_kwargs = {
    "echo": settings.ENVIRONMENT == "development",
}

# PostgreSQL 전용 옵션
if DATABASE_URL.startswith("postgresql"):
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
    })

engine = create_async_engine(DATABASE_URL, **engine_kwargs)

# 비동기 세션 팩토리
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI 의존성으로 사용할 DB 세션 생성기
    각 요청마다 독립적인 세션을 제공하고 자동으로 정리
    """
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    """
    데이터베이스 초기화 - 모든 테이블 생성
    애플리케이션 시작 시 호출
    """
    async with engine.begin() as conn:
        # 모든 모델을 임포트하여 Base.metadata에 등록
        from app.models import (  # noqa: F401
            News, User, OAuthAccount, Post, PostLike, Tag, Comment, CommentLike,
            IntelligenceSource, MarketInsight, NewsSentiment, SentimentSnapshot,
            Notification, PriceAlert, NotificationPreference, NewsSubscription,
        )

        await conn.run_sync(Base.metadata.create_all)
        logger.info("데이터베이스 테이블 생성 완료")


async def close_db():
    """
    데이터베이스 연결 종료
    애플리케이션 종료 시 호출
    """
    await engine.dispose()
    logger.info("데이터베이스 연결 종료 완료")
