"""
뉴스 모델 정의
RSS 피드에서 수집한 뉴스 기사를 저장
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Index
from sqlalchemy.sql import func

from app.core.database import Base


class News(Base):
    """
    뉴스 기사 모델
    
    Attributes:
        id: 기본 키
        title: 원문 제목
        title_kr: 한국어 번역 제목
        link: 기사 링크 (유니크)
        published: 발행 시간
        source: 뉴스 출처 (예: CoinDesk, CoinTelegraph)
        description: 기사 요약/설명 (옵션)
        created_at: 데이터베이스 저장 시간
    """
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # 기사 정보
    title = Column(String(500), nullable=False, comment="원문 제목")
    title_kr = Column(String(500), nullable=True, comment="한국어 번역 제목")
    link = Column(String(1000), unique=True, nullable=False, index=True, comment="기사 링크")
    published = Column(DateTime, nullable=True, comment="발행 시간")
    source = Column(String(100), nullable=False, index=True, comment="뉴스 출처")
    description = Column(Text, nullable=True, comment="기사 요약")
    
    # 메타데이터
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="데이터베이스 저장 시간"
    )

    # 인덱스 추가 (쿼리 최적화)
    __table_args__ = (
        Index('idx_news_source_published', 'source', 'published'),
        Index('idx_news_created_at', 'created_at'),
    )

    def __repr__(self):
        return f"<News(id={self.id}, title={self.title[:50]}..., source={self.source})>"
