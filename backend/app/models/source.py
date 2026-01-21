"""
정보 소스 모델 정의
RSS 피드 및 기타 정보 소스 설정을 저장
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Index
from sqlalchemy.sql import func

from app.core.database import Base


class IntelligenceSource(Base):
    """
    정보 소스 모델

    Attributes:
        id: 기본 키
        name: 소스 이름 (유니크)
        source_type: 소스 유형 (rss, api 등)
        url: 소스 URL
        is_enabled: 활성화 여부
        fetch_interval_seconds: 수집 주기 (초)
        last_fetch_at: 마지막 수집 시간
        last_success_at: 마지막 성공 시간
        success_count: 성공 횟수
        failure_count: 실패 횟수
        last_error: 마지막 오류 메시지
        created_at: 생성 시간
        updated_at: 수정 시간
    """
    __tablename__ = "intelligence_sources"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 소스 설정
    name = Column(String(100), unique=True, nullable=False, index=True, comment="소스 이름")
    source_type = Column(String(50), nullable=False, default="rss", comment="소스 유형 (rss, api 등)")
    url = Column(String(1000), nullable=False, comment="소스 URL")
    is_enabled = Column(Boolean, nullable=False, default=True, comment="활성화 여부")
    fetch_interval_seconds = Column(Integer, nullable=False, default=600, comment="수집 주기 (초)")

    # 상태 추적
    last_fetch_at = Column(DateTime, nullable=True, comment="마지막 수집 시간")
    last_success_at = Column(DateTime, nullable=True, comment="마지막 성공 시간")
    success_count = Column(Integer, nullable=False, default=0, comment="성공 횟수")
    failure_count = Column(Integer, nullable=False, default=0, comment="실패 횟수")
    last_error = Column(Text, nullable=True, comment="마지막 오류 메시지")

    # 메타데이터 (SQLite 호환: timezone 제거)
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="생성 시간"
    )
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정 시간"
    )

    # 인덱스 추가 (쿼리 최적화)
    __table_args__ = (
        Index('idx_source_enabled', 'is_enabled'),
        Index('idx_source_type', 'source_type'),
        Index('idx_source_created_at', 'created_at'),
    )

    def __repr__(self):
        return f"<IntelligenceSource(id={self.id}, name={self.name}, type={self.source_type}, enabled={self.is_enabled})>"
