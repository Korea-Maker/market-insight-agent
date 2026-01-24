"""
뉴스 감성 분석 결과 모델
FinBERT 모델로 분석된 뉴스 감성 데이터 저장
"""
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Text,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class NewsSentiment(Base):
    """
    뉴스 감성 분석 결과 테이블

    News 테이블과 1:1 관계
    FinBERT 모델을 사용한 딥러닝 기반 감성 분석 결과 저장

    Attributes:
        id: 기본 키
        news_id: News 테이블 외래 키 (1:1)
        sentiment_score: 감성 점수 (-1.0 ~ 1.0)
        sentiment_label: 감성 라벨 (very_bullish/bullish/neutral/bearish/very_bearish)
        confidence: 신뢰도 (0.0 ~ 1.0)
        positive_prob: 긍정 확률
        negative_prob: 부정 확률
        neutral_prob: 중립 확률
        related_symbols: 관련 심볼 (콤마 구분)
        relevance_score: 관련성 점수
        key_phrases: 판단 근거 키워드 (JSON)
        model_name: 사용된 모델명
        analyzed_at: 분석 시간
        processing_time_ms: 처리 시간 (밀리초)
    """

    __tablename__ = "news_sentiments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # News 테이블과 1:1 관계
    news_id = Column(
        Integer,
        ForeignKey("news.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
        comment="뉴스 ID (1:1 관계)",
    )

    # 감성 점수
    sentiment_score = Column(
        Float,
        nullable=False,
        comment="감성 점수 (-1.0 ~ 1.0)",
    )
    sentiment_label = Column(
        String(20),
        nullable=False,
        index=True,
        comment="감성 라벨 (very_bullish/bullish/neutral/bearish/very_bearish)",
    )

    # 확률 분포
    positive_prob = Column(Float, comment="긍정 확률 (0.0 ~ 1.0)")
    negative_prob = Column(Float, comment="부정 확률 (0.0 ~ 1.0)")
    neutral_prob = Column(Float, comment="중립 확률 (0.0 ~ 1.0)")

    # 신뢰도
    confidence = Column(
        Float,
        nullable=False,
        comment="신뢰도 (0.0 ~ 1.0)",
    )

    # 관련 심볼
    related_symbols = Column(
        String(200),
        nullable=True,
        index=True,
        comment="관련 심볼 (콤마 구분, 예: BTC,ETH)",
    )
    relevance_score = Column(
        Float,
        nullable=True,
        comment="관련성 점수 (0.0 ~ 1.0)",
    )

    # 해석 가능성
    key_phrases = Column(
        Text,
        nullable=True,
        comment="판단 근거 키워드 (JSON 배열)",
    )

    # 메타데이터
    model_name = Column(
        String(100),
        nullable=True,
        default="ProsusAI/finbert",
        comment="사용된 모델명",
    )
    analyzed_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        comment="분석 시간",
    )
    processing_time_ms = Column(
        Integer,
        nullable=True,
        comment="처리 시간 (밀리초)",
    )

    # 관계 설정
    news = relationship("News", backref="sentiment_analysis", uselist=False)

    # 복합 인덱스
    __table_args__ = (
        Index("idx_sentiment_analyzed_at", "analyzed_at"),
        Index("idx_sentiment_label_score", "sentiment_label", "sentiment_score"),
    )

    def __repr__(self):
        return (
            f"<NewsSentiment(id={self.id}, news_id={self.news_id}, "
            f"score={self.sentiment_score:.2f}, label={self.sentiment_label})>"
        )
