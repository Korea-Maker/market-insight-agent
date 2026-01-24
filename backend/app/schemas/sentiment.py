"""
감성 분석 API 스키마
Pydantic 모델 정의
"""
from datetime import datetime
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class SentimentLabel(str, Enum):
    """감성 라벨 열거형"""

    VERY_BULLISH = "very_bullish"  # 매우 강세 (0.6 ~ 1.0)
    BULLISH = "bullish"  # 강세 (0.2 ~ 0.6)
    NEUTRAL = "neutral"  # 중립 (-0.2 ~ 0.2)
    BEARISH = "bearish"  # 약세 (-0.6 ~ -0.2)
    VERY_BEARISH = "very_bearish"  # 매우 약세 (-1.0 ~ -0.6)


class MomentumType(str, Enum):
    """모멘텀 타입 열거형"""

    IMPROVING = "improving"  # 개선 중
    WORSENING = "worsening"  # 악화 중
    STABLE = "stable"  # 안정


# ============================================
# 개별 뉴스 감성 응답
# ============================================


class NewsSentimentResponse(BaseModel):
    """개별 뉴스 감성 분석 응답"""

    news_id: int = Field(..., description="뉴스 ID")
    title: str = Field(..., description="뉴스 제목")
    source: str = Field(..., description="뉴스 출처")
    published: Optional[datetime] = Field(None, description="발행 시간")

    # 감성 분석 결과
    sentiment_score: float = Field(
        ..., ge=-1.0, le=1.0, description="감성 점수 (-1.0 ~ 1.0)"
    )
    sentiment_label: SentimentLabel = Field(..., description="감성 라벨")
    confidence: float = Field(..., ge=0.0, le=1.0, description="신뢰도 (0.0 ~ 1.0)")

    # 확률 분포
    positive_prob: Optional[float] = Field(None, description="긍정 확률")
    negative_prob: Optional[float] = Field(None, description="부정 확률")
    neutral_prob: Optional[float] = Field(None, description="중립 확률")

    # 추가 정보
    key_phrases: List[str] = Field(default_factory=list, description="판단 근거 키워드")
    related_symbols: List[str] = Field(
        default_factory=list, description="관련 심볼 (BTC, ETH, ...)"
    )
    relevance_score: Optional[float] = Field(None, description="관련성 점수")

    # 메타데이터
    analyzed_at: Optional[datetime] = Field(None, description="분석 시간")

    class Config:
        from_attributes = True


class NewsSentimentBrief(BaseModel):
    """뉴스 감성 간략 정보 (목록용)"""

    news_id: int
    title: str
    source: str
    sentiment_score: float
    sentiment_label: SentimentLabel
    published: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================
# 집계 감성 응답
# ============================================


class SentimentStatistics(BaseModel):
    """감성 통계"""

    total_news: int = Field(..., description="총 뉴스 수")
    bullish_count: int = Field(0, description="강세 뉴스 수 (bullish + very_bullish)")
    bearish_count: int = Field(0, description="약세 뉴스 수 (bearish + very_bearish)")
    neutral_count: int = Field(0, description="중립 뉴스 수")
    bullish_ratio: float = Field(0.0, description="강세 비율 (0.0 ~ 1.0)")
    bearish_ratio: float = Field(0.0, description="약세 비율 (0.0 ~ 1.0)")


class SentimentTrend(BaseModel):
    """감성 트렌드"""

    score_change_1h: Optional[float] = Field(None, description="1시간 변화량")
    score_change_4h: Optional[float] = Field(None, description="4시간 변화량")
    score_change_24h: Optional[float] = Field(None, description="24시간 변화량")
    momentum: MomentumType = Field(
        MomentumType.STABLE, description="모멘텀 (improving/worsening/stable)"
    )


class AggregatedSentimentResponse(BaseModel):
    """집계된 시장 감성 응답"""

    symbol: str = Field(..., description="심볼 (BTC, ETH, ...)")
    timeframe: str = Field(..., description="시간 범위 (1h, 4h, 24h)")

    # 집계 점수
    sentiment_score: float = Field(
        ..., ge=-1.0, le=1.0, description="집계된 감성 점수"
    )
    sentiment_label: SentimentLabel = Field(..., description="감성 라벨")
    confidence: float = Field(..., ge=0.0, le=1.0, description="집계 신뢰도")

    # 통계 및 트렌드
    statistics: SentimentStatistics = Field(..., description="감성 통계")
    trend: SentimentTrend = Field(..., description="감성 트렌드")

    # 상위 뉴스
    top_bullish_news: List[NewsSentimentBrief] = Field(
        default_factory=list, description="상위 강세 뉴스"
    )
    top_bearish_news: List[NewsSentimentBrief] = Field(
        default_factory=list, description="상위 약세 뉴스"
    )

    # 메타데이터
    last_updated: datetime = Field(..., description="마지막 업데이트 시간")
    sample_size_adequate: bool = Field(
        True, description="샘플 크기 충분 여부 (최소 5개 이상)"
    )


# ============================================
# 감성 히스토리 응답
# ============================================


class SentimentHistoryPoint(BaseModel):
    """감성 히스토리 데이터 포인트"""

    timestamp: datetime = Field(..., description="시간")
    sentiment_score: float = Field(..., description="감성 점수")
    sentiment_label: SentimentLabel = Field(..., description="감성 라벨")
    news_count: int = Field(0, description="뉴스 수")
    confidence: Optional[float] = Field(None, description="신뢰도")


class SentimentHistoryResponse(BaseModel):
    """감성 히스토리 응답 (차트용)"""

    symbol: str = Field(..., description="심볼")
    interval: str = Field(..., description="데이터 간격 (1h, 4h, 24h)")
    days: int = Field(..., description="조회 일수")

    data: List[SentimentHistoryPoint] = Field(
        default_factory=list, description="히스토리 데이터"
    )

    # 요약
    average_score: float = Field(..., description="평균 감성 점수")
    min_score: float = Field(..., description="최소 감성 점수")
    max_score: float = Field(..., description="최대 감성 점수")
    total_news_analyzed: int = Field(..., description="총 분석된 뉴스 수")


# ============================================
# 분석 트리거 응답
# ============================================


class AnalysisJobResponse(BaseModel):
    """분석 작업 응답"""

    message: str = Field(..., description="응답 메시지")
    job_id: Optional[str] = Field(None, description="작업 ID")
    analyzed_count: int = Field(0, description="분석된 뉴스 수")
    status: str = Field("completed", description="작업 상태")


# ============================================
# 뉴스 목록 감성 응답
# ============================================


class NewsSentimentListResponse(BaseModel):
    """뉴스 감성 목록 응답"""

    total: int = Field(..., description="총 항목 수")
    items: List[NewsSentimentResponse] = Field(
        default_factory=list, description="뉴스 감성 목록"
    )
