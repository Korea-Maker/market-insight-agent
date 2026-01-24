"""
감성 분석 백그라운드 워커

미분석 뉴스를 주기적으로 처리하고 스냅샷 저장
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import select, and_, not_, exists
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.news import News
from app.models.news_sentiment import NewsSentiment
from app.services.sentiment.pipeline import SentimentPipeline
from app.services.sentiment.analyzer import SentimentAnalyzer
from app.services.sentiment.preprocessor import TextPreprocessor

logger = logging.getLogger(__name__)


class SentimentWorker:
    """
    감성 분석 백그라운드 워커

    Features:
    - 미분석 뉴스 자동 처리
    - 배치 처리 (GPU 효율화)
    - 정기 스냅샷 저장
    - 오류 복구 및 재시도
    """

    # 기본 심볼 목록 (스냅샷 저장용)
    DEFAULT_SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP"]
    DEFAULT_TIMEFRAMES = ["1h", "4h", "24h"]

    def __init__(
        self,
        batch_size: int = 16,
        processing_interval: int = 60,
        snapshot_interval: int = 3600,
        max_news_age_hours: int = 72,
    ):
        """
        Args:
            batch_size: 배치 크기
            processing_interval: 처리 주기 (초)
            snapshot_interval: 스냅샷 저장 주기 (초)
            max_news_age_hours: 처리할 뉴스 최대 나이 (시간)
        """
        self.batch_size = batch_size
        self.processing_interval = processing_interval
        self.snapshot_interval = snapshot_interval
        self.max_news_age_hours = max_news_age_hours

        # 공유 분석기 (모델 1회 로딩)
        self._analyzer: Optional[SentimentAnalyzer] = None
        self._preprocessor: Optional[TextPreprocessor] = None
        self._initialized = False

        # 스냅샷 타이머
        self._last_snapshot_time = datetime.now(timezone.utc)

    async def initialize(self) -> bool:
        """워커 초기화 (모델 로딩)"""
        if self._initialized:
            return True

        try:
            logger.info("SentimentWorker 초기화 중...")

            self._analyzer = SentimentAnalyzer(
                device="auto",
                cache_enabled=True,
            )
            self._preprocessor = TextPreprocessor()

            # 모델 로딩
            success = await self._analyzer.initialize()
            if not success:
                logger.error("SentimentAnalyzer 초기화 실패")
                return False

            self._initialized = True
            logger.info("SentimentWorker 초기화 완료")
            return True

        except Exception as e:
            logger.error(f"SentimentWorker 초기화 실패: {e}")
            return False

    async def run(self) -> None:
        """워커 메인 루프"""
        logger.info("SentimentWorker 시작")

        # 초기화
        if not await self.initialize():
            logger.error("SentimentWorker 초기화 실패, 종료")
            return

        while True:
            try:
                # 세션 생성
                async with AsyncSessionLocal() as db:
                    # 1. 미분석 뉴스 조회
                    unanalyzed = await self._get_unanalyzed_news(db)

                    if unanalyzed:
                        logger.info(f"미분석 뉴스 {len(unanalyzed)}개 처리 시작")

                        # 파이프라인 생성
                        pipeline = SentimentPipeline(
                            db=db,
                            analyzer=self._analyzer,
                            preprocessor=self._preprocessor,
                            batch_size=self.batch_size,
                        )

                        # 배치 처리
                        for i in range(0, len(unanalyzed), self.batch_size):
                            batch = unanalyzed[i : i + self.batch_size]
                            await pipeline.process_news_batch(batch)
                            logger.debug(
                                f"배치 처리 완료: {i + len(batch)}/{len(unanalyzed)}"
                            )

                        logger.info(f"감성 분석 완료: {len(unanalyzed)}개")

                    # 2. 스냅샷 저장 (주기적)
                    await self._maybe_save_snapshots(db)

                # 대기
                await asyncio.sleep(self.processing_interval)

            except asyncio.CancelledError:
                logger.info("SentimentWorker 종료 요청")
                break
            except Exception as e:
                logger.error(f"SentimentWorker 오류: {e}", exc_info=True)
                await asyncio.sleep(30)  # 오류 시 30초 대기

        logger.info("SentimentWorker 종료")

    async def _get_unanalyzed_news(
        self,
        db: AsyncSession,
        limit: int = 100,
    ) -> List[News]:
        """
        미분석 뉴스 조회

        Args:
            db: 데이터베이스 세션
            limit: 최대 조회 수

        Returns:
            News 모델 목록
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=self.max_news_age_hours)

        # 서브쿼리: 이미 분석된 뉴스 ID
        analyzed_subquery = select(NewsSentiment.news_id)

        # 미분석 뉴스 조회
        query = (
            select(News)
            .where(
                and_(
                    News.created_at >= cutoff,
                    not_(News.id.in_(analyzed_subquery)),
                )
            )
            .order_by(News.created_at.desc())
            .limit(limit)
        )

        result = await db.execute(query)
        return list(result.scalars().all())

    async def _maybe_save_snapshots(self, db: AsyncSession) -> None:
        """스냅샷 저장 (주기 확인)"""
        now = datetime.now(timezone.utc)
        elapsed = (now - self._last_snapshot_time).total_seconds()

        if elapsed < self.snapshot_interval:
            return

        logger.info("스냅샷 저장 시작")

        pipeline = SentimentPipeline(
            db=db,
            analyzer=self._analyzer,
            preprocessor=self._preprocessor,
        )

        # 각 심볼/시간대 조합에 대해 스냅샷 저장
        for symbol in self.DEFAULT_SYMBOLS:
            for timeframe in self.DEFAULT_TIMEFRAMES:
                try:
                    await pipeline.save_snapshot(symbol, timeframe)
                except Exception as e:
                    logger.warning(
                        f"스냅샷 저장 실패: {symbol}/{timeframe} - {e}"
                    )

        self._last_snapshot_time = now
        logger.info("스냅샷 저장 완료")

    async def process_single_news(
        self,
        news_id: int,
    ) -> Optional[NewsSentiment]:
        """
        단일 뉴스 즉시 처리 (API 트리거용)

        Args:
            news_id: 뉴스 ID

        Returns:
            NewsSentiment 모델 (실패 시 None)
        """
        if not self._initialized:
            await self.initialize()

        async with AsyncSessionLocal() as db:
            # 뉴스 조회
            result = await db.execute(select(News).where(News.id == news_id))
            news = result.scalar_one_or_none()

            if not news:
                logger.warning(f"뉴스를 찾을 수 없음: id={news_id}")
                return None

            # 이미 분석된 경우
            result = await db.execute(
                select(NewsSentiment).where(NewsSentiment.news_id == news_id)
            )
            existing = result.scalar_one_or_none()
            if existing:
                logger.info(f"이미 분석됨: news_id={news_id}")
                return existing

            # 파이프라인으로 처리
            pipeline = SentimentPipeline(
                db=db,
                analyzer=self._analyzer,
                preprocessor=self._preprocessor,
            )

            return await pipeline.process_news(news)


# 모듈 레벨 워커 인스턴스 (싱글톤)
_worker_instance: Optional[SentimentWorker] = None


def get_worker() -> SentimentWorker:
    """워커 싱글톤 인스턴스 반환"""
    global _worker_instance
    if _worker_instance is None:
        _worker_instance = SentimentWorker()
    return _worker_instance


async def run_sentiment_worker(
    interval_seconds: int = 60,
    snapshot_interval_seconds: int = 3600,
) -> None:
    """
    감성 분석 워커 실행 (main.py에서 호출)

    Args:
        interval_seconds: 처리 주기 (초)
        snapshot_interval_seconds: 스냅샷 저장 주기 (초)
    """
    worker = SentimentWorker(
        processing_interval=interval_seconds,
        snapshot_interval=snapshot_interval_seconds,
    )
    await worker.run()
