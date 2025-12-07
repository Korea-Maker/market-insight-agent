"""
데이터베이스 연결 및 세션 관리
SQLAlchemy 2.0 비동기 패턴 사용
"""
import logging
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

# 데이터베이스 URL 구성
DATABASE_URL = (
    f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
    f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
)

# 비동기 엔진 생성
engine = create_async_engine(
    DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",  # 개발 환경에서 SQL 로깅
    pool_pre_ping=True,  # 연결 확인
    pool_size=10,
    max_overflow=20,
)

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
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"데이터베이스 트랜잭션 오류: {e}")
            raise
        finally:
            await session.close()


async def init_db():
    """
    데이터베이스 초기화 - 모든 테이블 생성
    애플리케이션 시작 시 호출
    """
    async with engine.begin() as conn:
        # 모든 모델을 임포트하여 Base.metadata에 등록
        from app.models.news import News  # noqa: F401
        
        await conn.run_sync(Base.metadata.create_all)
        logger.info("데이터베이스 테이블 생성 완료")


async def close_db():
    """
    데이터베이스 연결 종료
    애플리케이션 종료 시 호출
    """
    await engine.dispose()
    logger.info("데이터베이스 연결 종료 완료")
