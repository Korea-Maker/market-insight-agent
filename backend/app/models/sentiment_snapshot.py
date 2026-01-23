"""
감성 스냅샷 모델
시간별 집계된 시장 감성을 저장하여 시계열 분석 지원
"""
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Index,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.core.database import Base


class SentimentSnapshot(Base):
    """
    시간별 감성 스냅샷 테이블

    시계열 분석을 위한 정기 스냅샷 저장
    심볼별, 시간대별로 집계된 시장 감성 데이터

    Attributes:
        id: 기본 키
        symbol: 심볼 (BTC, ETH, ...)
        timeframe: 집계 시간 범위 (1h, 4h, 24h)
        sentiment_score: 집계된 감성 점수 (-1.0 ~ 1.0)
        sentiment_label: 감성 라벨
        news_count: 분석된 뉴스 수
        bullish_count: 강세 뉴스 수
        bearish_count: 약세 뉴스 수
        neutral_count: 중립 뉴스 수
        confidence: 집계 신뢰도
        score_change: 이전 스냅샷 대비 변화
        snapshot_at: 스냅샷 시간
    """

    __tablename__ = "sentiment_snapshots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 심볼 및 시간대
    symbol = Column(
        String(20),
        nullable=False,
        index=True,
        comment="심볼 (BTC, ETH, ...)",
    )
    timeframe = Column(
        String(10),
        nullable=False,
        comment="집계 시간 범위 (1h, 4h, 24h)",
    )

    # 집계 점수
    sentiment_score = Column(
        Float,
        nullable=False,
        comment="집계된 감성 점수 (-1.0 ~ 1.0)",
    )
    sentiment_label = Column(
        String(20),
        nullable=False,
        comment="감성 라벨 (very_bullish/bullish/neutral/bearish/very_bearish)",
    )

    # 통계
    news_count = Column(
        Integer,
        nullable=False,
        default=0,
        comment="분석된 뉴스 수",
    )
    bullish_count = Column(
        Integer,
        nullable=True,
        default=0,
        comment="강세 뉴스 수 (bullish + very_bullish)",
    )
    bearish_count = Column(
        Integer,
        nullable=True,
        default=0,
        comment="약세 뉴스 수 (bearish + very_bearish)",
    )
    neutral_count = Column(
        Integer,
        nullable=True,
        default=0,
        comment="중립 뉴스 수",
    )

    # 신뢰도
    confidence = Column(
        Float,
        nullable=True,
        comment="집계 신뢰도 (0.0 ~ 1.0)",
    )

    # 트렌드
    score_change = Column(
        Float,
        nullable=True,
        comment="이전 스냅샷 대비 점수 변화",
    )

    # 타임스탬프
    snapshot_at = Column(
        DateTime,
        nullable=False,
        index=True,
        comment="스냅샷 시간",
    )
    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        comment="레코드 생성 시간",
    )

    # 복합 인덱스 및 유니크 제약
    __table_args__ = (
        Index("idx_snapshot_symbol_timeframe", "symbol", "timeframe"),
        Index("idx_snapshot_symbol_time", "symbol", "snapshot_at"),
        UniqueConstraint(
            "symbol",
            "timeframe",
            "snapshot_at",
            name="uq_snapshot_symbol_timeframe_at",
        ),
    )

    def __repr__(self):
        return (
            f"<SentimentSnapshot(id={self.id}, symbol={self.symbol}, "
            f"timeframe={self.timeframe}, score={self.sentiment_score:.2f}, "
            f"at={self.snapshot_at})>"
        )
