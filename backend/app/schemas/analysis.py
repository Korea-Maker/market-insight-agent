"""
시장 분석 관련 Pydantic 스키마
AI 생성 시장 분석 데이터의 요청/응답 모델
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
from enum import Enum


class TradingRecommendation(str, Enum):
    STRONG_BUY = "strong_buy"
    BUY = "buy"
    HOLD = "hold"
    SELL = "sell"
    STRONG_SELL = "strong_sell"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


class NewsPreview(BaseModel):
    """뉴스 미리보기"""
    id: int
    title: str
    title_kr: Optional[str] = None
    source: str
    published: Optional[datetime] = None

    class Config:
        from_attributes = True


class MarketInsightResponse(BaseModel):
    """시장 분석 응답"""
    id: int
    symbol: str
    created_at: datetime

    # 시장 데이터
    current_price: float
    price_change_24h: Optional[float] = None
    volume_24h: Optional[float] = None
    rsi_14: Optional[float] = None
    volatility_24h: Optional[float] = None

    # AI 분석
    analysis_summary: str
    price_change_reason: Optional[str] = None

    # 매매 제안
    recommendation: TradingRecommendation
    recommendation_reason: Optional[str] = None

    # 위험도 및 심리
    risk_level: RiskLevel
    market_sentiment_score: Optional[float] = None
    market_sentiment_label: Optional[str] = None

    # 관련 뉴스
    related_news: List[NewsPreview] = []

    # 메타데이터
    ai_model: Optional[str] = None
    processing_time_ms: Optional[int] = None

    class Config:
        from_attributes = True


class MarketInsightListResponse(BaseModel):
    """시장 분석 목록 응답"""
    total: int
    items: List[MarketInsightResponse]


class AnalysisTriggerResponse(BaseModel):
    """분석 트리거 응답"""
    message: str
    insight_id: int
    recommendation: str
