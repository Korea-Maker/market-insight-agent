"""
시장 분석 결과 모델
AI가 생성한 시장 분석 데이터를 저장
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class TradingRecommendation(str, enum.Enum):
    """매매 추천"""
    STRONG_BUY = "strong_buy"
    BUY = "buy"
    HOLD = "hold"
    SELL = "sell"
    STRONG_SELL = "strong_sell"


class RiskLevel(str, enum.Enum):
    """위험도"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


# 다대다 관계 테이블 (분석 결과 - 뉴스)
insight_news_association = Table(
    'insight_news',
    Base.metadata,
    Column('insight_id', Integer, ForeignKey('market_insights.id', ondelete='CASCADE')),
    Column('news_id', Integer, ForeignKey('news.id', ondelete='CASCADE'))
)


class MarketInsight(Base):
    """시장 분석 결과"""
    __tablename__ = "market_insights"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True, comment="거래 쌍 (예: BTCUSDT)")
    created_at = Column(DateTime, default=datetime.utcnow, index=True, comment="생성 시간")

    # 시장 데이터
    current_price = Column(Float, nullable=False, comment="현재 가격")
    price_change_24h = Column(Float, comment="24시간 가격 변동률 (%)")
    volume_24h = Column(Float, comment="24시간 거래량")

    # 기술적 지표
    rsi_14 = Column(Float, comment="RSI(14)")
    volatility_24h = Column(Float, comment="24시간 변동성 (%)")

    # AI 분석 결과
    analysis_summary = Column(Text, nullable=False, comment="전체 분석 요약")
    price_change_reason = Column(Text, comment="가격 변동 원인")

    # 매매 제안
    recommendation = Column(
        Enum(TradingRecommendation),
        nullable=False,
        comment="매매 추천 (strong_buy/buy/hold/sell/strong_sell)"
    )
    recommendation_reason = Column(Text, comment="추천 근거")

    # 위험도 및 심리
    risk_level = Column(
        Enum(RiskLevel),
        nullable=False,
        comment="위험도 (low/medium/high/very_high)"
    )
    market_sentiment_score = Column(Float, comment="시장 심리 점수 (0-100)")
    market_sentiment_label = Column(String(20), comment="시장 심리 라벨")

    # 메타데이터
    ai_model = Column(String(50), comment="사용된 AI 모델")
    processing_time_ms = Column(Integer, comment="처리 시간 (밀리초)")

    # 관계
    related_news = relationship(
        "News",
        secondary=insight_news_association,
        backref="market_insights"
    )

    def __repr__(self):
        return f"<MarketInsight {self.symbol} {self.created_at} {self.recommendation.value}>"
