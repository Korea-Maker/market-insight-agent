"""
감성 분석 API 라우터

뉴스 감성 분석 결과 조회 및 집계 API 제공
"""
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, desc, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.news import News
from app.models.news_sentiment import NewsSentiment
from app.models.sentiment_snapshot import SentimentSnapshot
from app.schemas.sentiment import (
    SentimentLabel,
    MomentumType,
    NewsSentimentResponse,
    NewsSentimentBrief,
    NewsSentimentListResponse,
    AggregatedSentimentResponse,
    SentimentStatistics,
    SentimentTrend,
    SentimentHistoryResponse,
    SentimentHistoryPoint,
    AnalysisJobResponse,
)
from app.services.sentiment.pipeline import SentimentPipeline
from app.services.sentiment.aggregator import SentimentAggregator

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/sentiment",
    tags=["Sentiment"],
)


# ============================================
# 개별 뉴스 감성 API
# ============================================


@router.get("/news/{news_id}", response_model=NewsSentimentResponse)
async def get_news_sentiment(
    news_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    개별 뉴스 감성 분석 결과 조회

    - **news_id**: 뉴스 ID
    """
    # 감성 분석 결과 조회 (News join)
    query = (
        select(NewsSentiment, News)
        .join(News, NewsSentiment.news_id == News.id)
        .where(NewsSentiment.news_id == news_id)
    )

    result = await db.execute(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=404,
            detail=f"뉴스 ID {news_id}의 감성 분석 결과를 찾을 수 없습니다",
        )

    sentiment, news = row

    # key_phrases JSON 파싱
    key_phrases = []
    if sentiment.key_phrases:
        try:
            key_phrases = json.loads(sentiment.key_phrases)
        except json.JSONDecodeError:
            pass

    # related_symbols 파싱
    related_symbols = (
        sentiment.related_symbols.split(",") if sentiment.related_symbols else []
    )

    return NewsSentimentResponse(
        news_id=news.id,
        title=news.title,
        source=news.source,
        published=news.published,
        sentiment_score=sentiment.sentiment_score,
        sentiment_label=SentimentLabel(sentiment.sentiment_label),
        confidence=sentiment.confidence,
        positive_prob=sentiment.positive_prob,
        negative_prob=sentiment.negative_prob,
        neutral_prob=sentiment.neutral_prob,
        key_phrases=key_phrases,
        related_symbols=related_symbols,
        relevance_score=sentiment.relevance_score,
        analyzed_at=sentiment.analyzed_at,
    )


@router.get("/news", response_model=NewsSentimentListResponse)
async def list_news_sentiments(
    skip: int = Query(0, ge=0, description="건너뛸 항목 수"),
    limit: int = Query(20, ge=1, le=100, description="가져올 항목 수"),
    symbol: Optional[str] = Query(None, description="심볼 필터 (BTC, ETH, ...)"),
    label: Optional[str] = Query(
        None, description="감성 라벨 필터 (bullish, bearish, neutral)"
    ),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0, description="최소 신뢰도"),
    db: AsyncSession = Depends(get_db),
):
    """
    뉴스 감성 분석 목록 조회

    - **skip**: 페이지네이션 오프셋
    - **limit**: 가져올 항목 수 (최대 100)
    - **symbol**: 심볼 필터 (선택)
    - **label**: 감성 라벨 필터 (선택)
    - **min_confidence**: 최소 신뢰도 필터
    """
    # 기본 쿼리
    query = (
        select(NewsSentiment, News)
        .join(News, NewsSentiment.news_id == News.id)
        .where(NewsSentiment.confidence >= min_confidence)
    )
    count_query = select(func.count()).select_from(NewsSentiment).where(
        NewsSentiment.confidence >= min_confidence
    )

    # 심볼 필터
    if symbol:
        query = query.where(NewsSentiment.related_symbols.like(f"%{symbol}%"))
        count_query = count_query.where(
            NewsSentiment.related_symbols.like(f"%{symbol}%")
        )

    # 라벨 필터
    if label:
        # bullish → bullish, very_bullish
        if label.lower() == "bullish":
            query = query.where(
                NewsSentiment.sentiment_label.in_(["bullish", "very_bullish"])
            )
            count_query = count_query.where(
                NewsSentiment.sentiment_label.in_(["bullish", "very_bullish"])
            )
        elif label.lower() == "bearish":
            query = query.where(
                NewsSentiment.sentiment_label.in_(["bearish", "very_bearish"])
            )
            count_query = count_query.where(
                NewsSentiment.sentiment_label.in_(["bearish", "very_bearish"])
            )
        else:
            query = query.where(NewsSentiment.sentiment_label == label.lower())
            count_query = count_query.where(
                NewsSentiment.sentiment_label == label.lower()
            )

    # 정렬 및 페이지네이션
    query = query.order_by(desc(News.published)).offset(skip).limit(limit)

    # 실행
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    result = await db.execute(query)
    rows = result.all()

    items = []
    for sentiment, news in rows:
        key_phrases = []
        if sentiment.key_phrases:
            try:
                key_phrases = json.loads(sentiment.key_phrases)
            except json.JSONDecodeError:
                pass

        related_symbols = (
            sentiment.related_symbols.split(",") if sentiment.related_symbols else []
        )

        items.append(
            NewsSentimentResponse(
                news_id=news.id,
                title=news.title,
                source=news.source,
                published=news.published,
                sentiment_score=sentiment.sentiment_score,
                sentiment_label=SentimentLabel(sentiment.sentiment_label),
                confidence=sentiment.confidence,
                positive_prob=sentiment.positive_prob,
                negative_prob=sentiment.negative_prob,
                neutral_prob=sentiment.neutral_prob,
                key_phrases=key_phrases,
                related_symbols=related_symbols,
                relevance_score=sentiment.relevance_score,
                analyzed_at=sentiment.analyzed_at,
            )
        )

    return NewsSentimentListResponse(total=total, items=items)


# ============================================
# 집계 감성 API
# ============================================


@router.get("/aggregated", response_model=AggregatedSentimentResponse)
async def get_aggregated_sentiment(
    symbol: str = Query("BTC", description="심볼 (BTC, ETH, ALL 등)"),
    timeframe: str = Query("24h", description="시간 범위 (1h, 4h, 24h)"),
    db: AsyncSession = Depends(get_db),
):
    """
    집계된 시장 감성 조회

    - **symbol**: 심볼 (BTC, ETH 또는 ALL)
    - **timeframe**: 시간 범위 (1h, 4h, 24h)

    가중 평균으로 계산된 전체 시장 감성을 반환합니다.
    """
    aggregator = SentimentAggregator(db)
    aggregated = await aggregator.aggregate(symbol, timeframe)

    # 통계
    total = aggregated.total_news_count
    statistics = SentimentStatistics(
        total_news=total,
        bullish_count=aggregated.bullish_count,
        bearish_count=aggregated.bearish_count,
        neutral_count=aggregated.neutral_count,
        bullish_ratio=aggregated.bullish_count / total if total > 0 else 0.0,
        bearish_ratio=aggregated.bearish_count / total if total > 0 else 0.0,
    )

    # 트렌드
    momentum_map = {
        "improving": MomentumType.IMPROVING,
        "worsening": MomentumType.WORSENING,
        "stable": MomentumType.STABLE,
    }
    trend = SentimentTrend(
        score_change_24h=aggregated.sentiment_change,
        momentum=momentum_map.get(aggregated.momentum, MomentumType.STABLE),
    )

    # 상위 뉴스
    top_bullish = [
        NewsSentimentBrief(
            news_id=n.news_id,
            title=n.title,
            source=n.source,
            sentiment_score=n.sentiment_score,
            sentiment_label=SentimentLabel(n.sentiment_label.value),
            published=n.published,
        )
        for n in aggregated.top_bullish_news
    ]

    top_bearish = [
        NewsSentimentBrief(
            news_id=n.news_id,
            title=n.title,
            source=n.source,
            sentiment_score=n.sentiment_score,
            sentiment_label=SentimentLabel(n.sentiment_label.value),
            published=n.published,
        )
        for n in aggregated.top_bearish_news
    ]

    return AggregatedSentimentResponse(
        symbol=symbol,
        timeframe=timeframe,
        sentiment_score=aggregated.sentiment_score,
        sentiment_label=SentimentLabel(aggregated.sentiment_label.value),
        confidence=aggregated.confidence,
        statistics=statistics,
        trend=trend,
        top_bullish_news=top_bullish,
        top_bearish_news=top_bearish,
        last_updated=datetime.now(timezone.utc),
        sample_size_adequate=aggregated.sample_size_adequate,
    )


# ============================================
# 감성 히스토리 API
# ============================================


@router.get("/history", response_model=SentimentHistoryResponse)
async def get_sentiment_history(
    symbol: str = Query("BTC", description="심볼"),
    days: int = Query(7, ge=1, le=30, description="조회 일수"),
    interval: str = Query("1h", description="데이터 간격 (1h, 4h, 24h)"),
    db: AsyncSession = Depends(get_db),
):
    """
    감성 히스토리 조회 (차트용)

    - **symbol**: 심볼
    - **days**: 조회 일수 (1-30)
    - **interval**: 데이터 간격 (1h, 4h, 24h)

    시계열 감성 데이터를 반환합니다.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    query = (
        select(SentimentSnapshot)
        .where(
            and_(
                SentimentSnapshot.symbol == symbol,
                SentimentSnapshot.timeframe == interval,
                SentimentSnapshot.snapshot_at >= cutoff,
            )
        )
        .order_by(SentimentSnapshot.snapshot_at)
    )

    result = await db.execute(query)
    snapshots = result.scalars().all()

    data = [
        SentimentHistoryPoint(
            timestamp=s.snapshot_at,
            sentiment_score=s.sentiment_score,
            sentiment_label=SentimentLabel(s.sentiment_label),
            news_count=s.news_count,
            confidence=s.confidence,
        )
        for s in snapshots
    ]

    # 요약 계산
    scores = [d.sentiment_score for d in data]
    total_news = sum(d.news_count for d in data)

    return SentimentHistoryResponse(
        symbol=symbol,
        interval=interval,
        days=days,
        data=data,
        average_score=sum(scores) / len(scores) if scores else 0.0,
        min_score=min(scores) if scores else 0.0,
        max_score=max(scores) if scores else 0.0,
        total_news_analyzed=total_news,
    )


# ============================================
# 분석 트리거 API
# ============================================


@router.post("/analyze", response_model=AnalysisJobResponse)
async def trigger_sentiment_analysis(
    hours: int = Query(24, ge=1, le=72, description="분석할 시간 범위"),
    db: AsyncSession = Depends(get_db),
):
    """
    수동 감성 분석 트리거 (관리자용)

    - **hours**: 분석할 뉴스 시간 범위 (1-72시간)

    지정된 시간 범위 내 미분석 뉴스에 대해 감성 분석을 수행합니다.

    **주의**: 이 엔드포인트는 관리자 전용이며, 향후 인증이 추가될 예정입니다.
    """
    try:
        from app.services.sentiment.worker import get_worker

        # 워커 인스턴스 가져오기
        worker = get_worker()

        # 초기화 확인
        if not worker._initialized:
            await worker.initialize()

        # 미분석 뉴스 조회
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        analyzed_subquery = select(NewsSentiment.news_id)
        query = (
            select(News)
            .where(
                and_(
                    News.created_at >= cutoff,
                    ~News.id.in_(analyzed_subquery),
                )
            )
            .order_by(News.created_at.desc())
            .limit(100)
        )

        result = await db.execute(query)
        unanalyzed = list(result.scalars().all())

        if not unanalyzed:
            return AnalysisJobResponse(
                message="분석할 뉴스가 없습니다",
                analyzed_count=0,
                status="completed",
            )

        # 파이프라인으로 처리
        pipeline = SentimentPipeline(
            db=db,
            analyzer=worker._analyzer,
            preprocessor=worker._preprocessor,
        )

        sentiments = await pipeline.process_news_batch(unanalyzed)

        return AnalysisJobResponse(
            message=f"{len(sentiments)}개 뉴스 감성 분석 완료",
            analyzed_count=len(sentiments),
            status="completed",
        )

    except ImportError as e:
        logger.warning(f"감성 분석 워커 로딩 실패: {e}")
        raise HTTPException(
            status_code=503,
            detail="감성 분석 서비스가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
        )
    except Exception as e:
        logger.error(f"감성 분석 트리거 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"감성 분석 중 오류가 발생했습니다: {str(e)}",
        )


# ============================================
# 통계 API
# ============================================


@router.get("/stats")
async def get_sentiment_stats(
    db: AsyncSession = Depends(get_db),
):
    """
    감성 분석 통계 조회

    전체 분석 현황 및 라벨별 분포를 반환합니다.
    """
    # 전체 분석 수
    total_query = select(func.count()).select_from(NewsSentiment)
    total_result = await db.execute(total_query)
    total_analyzed = total_result.scalar() or 0

    # 라벨별 분포
    label_query = (
        select(NewsSentiment.sentiment_label, func.count())
        .group_by(NewsSentiment.sentiment_label)
    )
    label_result = await db.execute(label_query)
    label_distribution = {row[0]: row[1] for row in label_result.all()}

    # 평균 신뢰도
    confidence_query = select(func.avg(NewsSentiment.confidence))
    confidence_result = await db.execute(confidence_query)
    avg_confidence = confidence_result.scalar() or 0.0

    # 최근 24시간 분석 수
    recent_cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_query = (
        select(func.count())
        .select_from(NewsSentiment)
        .where(NewsSentiment.analyzed_at >= recent_cutoff)
    )
    recent_result = await db.execute(recent_query)
    recent_count = recent_result.scalar() or 0

    return {
        "total_analyzed": total_analyzed,
        "label_distribution": label_distribution,
        "average_confidence": round(avg_confidence, 3),
        "recent_24h_count": recent_count,
    }
