"""
감성 집계기

시간대별/심볼별로 뉴스 감성을 집계
- 시간 가중치: 최신 뉴스에 높은 가중치
- 소스 가중치: 신뢰도 높은 소스 우선
- 관련성 가중치: 심볼 연관도 반영
"""
import logging
import math
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Tuple
from dataclasses import dataclass, field

from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.news import News
from app.models.news_sentiment import NewsSentiment
from app.models.sentiment_snapshot import SentimentSnapshot
from app.services.sentiment.analyzer import SentimentLabel

logger = logging.getLogger(__name__)


@dataclass
class NewsSentimentInsight:
    """개별 뉴스 감성 인사이트"""

    news_id: int
    title: str
    source: str
    published: Optional[datetime]

    # 감성
    sentiment_score: float
    sentiment_label: SentimentLabel
    confidence: float

    # 관련성
    related_symbols: List[str] = field(default_factory=list)
    relevance_score: float = 0.5


@dataclass
class AggregatedSentiment:
    """집계된 시장 감성"""

    symbol: str
    timeframe: str

    # 점수
    sentiment_score: float
    sentiment_label: SentimentLabel
    confidence: float

    # 통계
    total_news_count: int
    bullish_count: int
    bearish_count: int
    neutral_count: int

    # 트렌드
    sentiment_change: float = 0.0
    momentum: str = "stable"  # "improving", "worsening", "stable"

    # 샘플 적절성
    sample_size_adequate: bool = True

    # 상위 뉴스
    top_bullish_news: List[NewsSentimentInsight] = field(default_factory=list)
    top_bearish_news: List[NewsSentimentInsight] = field(default_factory=list)


class SentimentAggregator:
    """
    감성 점수 집계기

    집계 전략:
    - 시간 가중치: 최신 뉴스에 높은 가중치 (지수 감쇠)
    - 소스 가중치: 신뢰도 높은 소스 우선
    - 관련성 가중치: 심볼 연관도 반영
    - 신뢰도 가중치: 모델 신뢰도 반영
    """

    # 소스별 신뢰도 가중치
    SOURCE_WEIGHTS: Dict[str, float] = {
        "CoinDesk": 1.0,
        "The Block": 1.0,
        "CoinTelegraph": 0.9,
        "Decrypt": 0.9,
        "CryptoSlate": 0.85,
        "NewsBTC": 0.8,
        "Bitcoin Magazine": 0.9,
        "Bitcoinist": 0.75,
        "CryptoPotato": 0.75,
        "BeInCrypto": 0.8,
        "U.Today": 0.7,
        "AMBCrypto": 0.7,
        "CryptoNews": 0.75,
        "DailyHodl": 0.7,
    }
    DEFAULT_SOURCE_WEIGHT = 0.6

    # 시간 감쇠 파라미터
    TIME_DECAY_HALF_LIFE_HOURS = 6  # 6시간 반감기

    # 가중치 비율
    WEIGHT_TIME = 0.30
    WEIGHT_SOURCE = 0.25
    WEIGHT_RELEVANCE = 0.25
    WEIGHT_CONFIDENCE = 0.20

    # 최소 샘플 수
    MIN_SAMPLE_SIZE = 5

    def __init__(self, db: AsyncSession):
        """
        Args:
            db: SQLAlchemy 비동기 세션
        """
        self.db = db

    async def aggregate(
        self,
        symbol: str,
        timeframe: str,
        min_confidence: float = 0.3,
    ) -> AggregatedSentiment:
        """
        심볼별 감성 집계

        Args:
            symbol: 심볼 (BTC, ETH, ...)
            timeframe: 시간 범위 ("1h", "4h", "24h")
            min_confidence: 최소 신뢰도 필터

        Returns:
            AggregatedSentiment 객체
        """
        # 1. 시간 범위 계산
        hours = self._parse_timeframe(timeframe)
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        # 2. 감성 분석된 뉴스 조회
        insights = await self._fetch_insights(symbol, cutoff, min_confidence)

        if not insights:
            return self._empty_aggregation(symbol, timeframe)

        # 3. 가중 평균 계산
        weighted_score, avg_confidence = self._calculate_weighted_average(insights)

        # 4. 라벨 결정
        label = self._score_to_label(weighted_score)

        # 5. 통계 집계
        bullish_count = sum(
            1
            for i in insights
            if i.sentiment_label
            in [SentimentLabel.BULLISH, SentimentLabel.VERY_BULLISH]
        )
        bearish_count = sum(
            1
            for i in insights
            if i.sentiment_label
            in [SentimentLabel.BEARISH, SentimentLabel.VERY_BEARISH]
        )
        neutral_count = len(insights) - bullish_count - bearish_count

        # 6. 트렌드 분석
        sentiment_change, momentum = await self._analyze_trend(symbol, timeframe)

        # 7. 상위 뉴스 추출
        top_bullish = self._get_top_n(insights, positive=True, n=3)
        top_bearish = self._get_top_n(insights, positive=False, n=3)

        return AggregatedSentiment(
            symbol=symbol,
            timeframe=timeframe,
            sentiment_score=weighted_score,
            sentiment_label=label,
            confidence=avg_confidence,
            total_news_count=len(insights),
            bullish_count=bullish_count,
            bearish_count=bearish_count,
            neutral_count=neutral_count,
            sentiment_change=sentiment_change,
            momentum=momentum,
            sample_size_adequate=len(insights) >= self.MIN_SAMPLE_SIZE,
            top_bullish_news=top_bullish,
            top_bearish_news=top_bearish,
        )

    async def _fetch_insights(
        self,
        symbol: str,
        cutoff: datetime,
        min_confidence: float,
    ) -> List[NewsSentimentInsight]:
        """감성 분석된 뉴스 조회"""
        # symbol이 related_symbols에 포함된 뉴스 또는 전체 (symbol이 "ALL"인 경우)
        if symbol.upper() == "ALL":
            query = (
                select(NewsSentiment, News)
                .join(News, NewsSentiment.news_id == News.id)
                .where(
                    and_(
                        NewsSentiment.confidence >= min_confidence,
                        News.published >= cutoff,
                    )
                )
                .order_by(desc(News.published))
                .limit(200)
            )
        else:
            # LIKE 검색으로 심볼 포함 여부 확인
            query = (
                select(NewsSentiment, News)
                .join(News, NewsSentiment.news_id == News.id)
                .where(
                    and_(
                        NewsSentiment.confidence >= min_confidence,
                        News.published >= cutoff,
                        NewsSentiment.related_symbols.like(f"%{symbol}%"),
                    )
                )
                .order_by(desc(News.published))
                .limit(100)
            )

        result = await self.db.execute(query)
        rows = result.all()

        insights = []
        for sentiment, news in rows:
            related_symbols = (
                sentiment.related_symbols.split(",")
                if sentiment.related_symbols
                else []
            )
            insights.append(
                NewsSentimentInsight(
                    news_id=sentiment.news_id,
                    title=news.title,
                    source=news.source,
                    published=news.published,
                    sentiment_score=sentiment.sentiment_score,
                    sentiment_label=SentimentLabel(sentiment.sentiment_label),
                    confidence=sentiment.confidence,
                    related_symbols=related_symbols,
                    relevance_score=sentiment.relevance_score or 0.5,
                )
            )

        return insights

    def _calculate_weighted_average(
        self,
        insights: List[NewsSentimentInsight],
    ) -> Tuple[float, float]:
        """
        가중 평균 계산

        Returns:
            (가중 평균 점수, 평균 신뢰도)
        """
        if not insights:
            return 0.0, 0.0

        now = datetime.now(timezone.utc)
        total_weight = 0.0
        weighted_sum = 0.0
        confidence_sum = 0.0

        for insight in insights:
            # 시간 가중치 (지수 감쇠)
            time_weight = self._time_decay_weight(insight.published, now)

            # 소스 가중치
            source_weight = self.SOURCE_WEIGHTS.get(
                insight.source, self.DEFAULT_SOURCE_WEIGHT
            )

            # 관련성 가중치
            relevance_weight = insight.relevance_score

            # 신뢰도 가중치
            confidence_weight = insight.confidence

            # 종합 가중치
            weight = (
                time_weight * self.WEIGHT_TIME
                + source_weight * self.WEIGHT_SOURCE
                + relevance_weight * self.WEIGHT_RELEVANCE
                + confidence_weight * self.WEIGHT_CONFIDENCE
            )

            weighted_sum += insight.sentiment_score * weight
            total_weight += weight
            confidence_sum += insight.confidence

        avg_score = weighted_sum / total_weight if total_weight > 0 else 0.0
        avg_confidence = confidence_sum / len(insights) if insights else 0.0

        return avg_score, avg_confidence

    def _time_decay_weight(
        self,
        published: Optional[datetime],
        now: datetime,
    ) -> float:
        """시간 감쇠 가중치 계산 (지수 감쇠)"""
        if not published:
            return 0.5

        # timezone-aware 처리
        if published.tzinfo is None:
            published = published.replace(tzinfo=timezone.utc)

        age_hours = (now - published).total_seconds() / 3600

        # 지수 감쇠: weight = 0.5^(age/half_life)
        decay = math.pow(0.5, age_hours / self.TIME_DECAY_HALF_LIFE_HOURS)

        return max(0.1, decay)  # 최소 0.1 보장

    async def _analyze_trend(
        self,
        symbol: str,
        timeframe: str,
    ) -> Tuple[float, str]:
        """
        트렌드 분석 (이전 스냅샷과 비교)

        Returns:
            (점수 변화량, 모멘텀 문자열)
        """
        # 최근 2개 스냅샷 조회
        query = (
            select(SentimentSnapshot)
            .where(
                and_(
                    SentimentSnapshot.symbol == symbol,
                    SentimentSnapshot.timeframe == timeframe,
                )
            )
            .order_by(desc(SentimentSnapshot.snapshot_at))
            .limit(2)
        )

        result = await self.db.execute(query)
        snapshots = result.scalars().all()

        if len(snapshots) < 2:
            return 0.0, "stable"

        current = snapshots[0]
        previous = snapshots[1]

        change = current.sentiment_score - previous.sentiment_score

        if change > 0.1:
            momentum = "improving"
        elif change < -0.1:
            momentum = "worsening"
        else:
            momentum = "stable"

        return change, momentum

    def _get_top_n(
        self,
        insights: List[NewsSentimentInsight],
        positive: bool,
        n: int = 3,
    ) -> List[NewsSentimentInsight]:
        """상위 N개 뉴스 추출"""
        if positive:
            # 점수 높은 순
            sorted_insights = sorted(
                insights, key=lambda x: x.sentiment_score, reverse=True
            )
        else:
            # 점수 낮은 순
            sorted_insights = sorted(insights, key=lambda x: x.sentiment_score)

        return sorted_insights[:n]

    def _score_to_label(self, score: float) -> SentimentLabel:
        """점수를 라벨로 변환"""
        if score >= 0.6:
            return SentimentLabel.VERY_BULLISH
        elif score >= 0.2:
            return SentimentLabel.BULLISH
        elif score >= -0.2:
            return SentimentLabel.NEUTRAL
        elif score >= -0.6:
            return SentimentLabel.BEARISH
        else:
            return SentimentLabel.VERY_BEARISH

    def _parse_timeframe(self, timeframe: str) -> int:
        """시간 범위 문자열을 시간으로 변환"""
        mapping = {
            "1h": 1,
            "4h": 4,
            "8h": 8,
            "12h": 12,
            "24h": 24,
            "48h": 48,
            "7d": 168,
        }
        return mapping.get(timeframe, 24)

    def _empty_aggregation(
        self,
        symbol: str,
        timeframe: str,
    ) -> AggregatedSentiment:
        """빈 집계 결과 반환"""
        return AggregatedSentiment(
            symbol=symbol,
            timeframe=timeframe,
            sentiment_score=0.0,
            sentiment_label=SentimentLabel.NEUTRAL,
            confidence=0.0,
            total_news_count=0,
            bullish_count=0,
            bearish_count=0,
            neutral_count=0,
            sample_size_adequate=False,
        )

    async def save_snapshot(
        self,
        aggregated: AggregatedSentiment,
    ) -> SentimentSnapshot:
        """집계 결과를 스냅샷으로 저장"""
        snapshot = SentimentSnapshot(
            symbol=aggregated.symbol,
            timeframe=aggregated.timeframe,
            sentiment_score=aggregated.sentiment_score,
            sentiment_label=aggregated.sentiment_label.value,
            news_count=aggregated.total_news_count,
            bullish_count=aggregated.bullish_count,
            bearish_count=aggregated.bearish_count,
            neutral_count=aggregated.neutral_count,
            confidence=aggregated.confidence,
            score_change=aggregated.sentiment_change,
            snapshot_at=datetime.now(timezone.utc),
        )

        self.db.add(snapshot)
        await self.db.commit()
        await self.db.refresh(snapshot)

        logger.info(
            f"스냅샷 저장: {snapshot.symbol}/{snapshot.timeframe} "
            f"score={snapshot.sentiment_score:.2f}"
        )

        return snapshot
