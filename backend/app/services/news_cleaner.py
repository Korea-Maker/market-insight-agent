"""
뉴스 데이터 정리 서비스
오래된 뉴스를 자동으로 삭제하여 데이터베이스 용량 관리
"""
import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy import delete

from app.core.database import AsyncSessionLocal
from app.models.news import News

logger = logging.getLogger(__name__)


async def cleanup_old_news(days: int = 30) -> int:
    """
    지정된 일수보다 오래된 뉴스 삭제

    Args:
        days: 보관 기간 (일)

    Returns:
        삭제된 뉴스 개수
    """
    async with AsyncSessionLocal() as session:
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)

            stmt = delete(News).where(News.created_at < cutoff_date)
            result = await session.execute(stmt)
            await session.commit()

            deleted_count = result.rowcount
            logger.info(f"{days}일 이상 된 뉴스 {deleted_count}개 삭제 완료")

            return deleted_count

        except Exception as e:
            await session.rollback()
            logger.error(f"뉴스 정리 중 오류 발생: {e}")
            raise


async def run_news_cleaner(cleanup_days: int = 30):
    """
    뉴스 정리 백그라운드 태스크
    매일 자정(UTC)에 실행

    Args:
        cleanup_days: 보관 기간 (일)
    """
    logger.info(f"뉴스 정리 서비스 시작 (보관 기간: {cleanup_days}일)")

    while True:
        try:
            # 다음 자정까지 대기 시간 계산
            now = datetime.utcnow()
            next_midnight = (now + timedelta(days=1)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            wait_seconds = (next_midnight - now).total_seconds()

            logger.info(f"다음 뉴스 정리까지 {wait_seconds/3600:.1f}시간 대기")
            await asyncio.sleep(wait_seconds)

            # 정리 실행
            await cleanup_old_news(days=cleanup_days)

        except asyncio.CancelledError:
            logger.info("뉴스 정리 서비스 종료")
            break

        except Exception as e:
            logger.error(f"뉴스 정리 서비스 오류: {e}")
            # 오류 발생 시 1시간 후 재시도
            await asyncio.sleep(3600)
