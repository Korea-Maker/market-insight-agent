"""
알림 설정 모델 정의
NotificationPreference, NewsSubscription 모델
"""
from datetime import datetime, time
from sqlalchemy import (
    Column, Integer, String, DateTime, Time, Boolean,
    ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class NotificationPreference(Base):
    """
    알림 설정 모델

    사용자별 알림 수신 설정을 저장합니다.

    Attributes:
        id: 설정 고유 ID
        user_id: 사용자 (유니크)
        price_alerts: 가격 알림 활성화
        news_alerts: 뉴스 알림 활성화
        system_alerts: 시스템 알림 활성화
        email_enabled: 이메일 알림 (Future)
        push_enabled: 푸시 알림 (Future)
        quiet_start: 방해금지 시작 시간
        quiet_end: 방해금지 종료 시간
        created_at: 생성 시간
        updated_at: 수정 시간
    """
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 사용자 (1:1 관계)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        comment="사용자"
    )

    # 알림 유형별 활성화
    price_alerts = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="가격 알림 활성화"
    )
    news_alerts = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="뉴스 알림 활성화"
    )
    system_alerts = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="시스템 알림 활성화"
    )

    # 알림 채널 (Future)
    email_enabled = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="이메일 알림"
    )
    push_enabled = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="푸시 알림"
    )

    # 방해금지 모드 (시간은 문자열로 저장 - SQLite 호환)
    quiet_start = Column(String(5), nullable=True, comment="방해금지 시작 (HH:MM)")
    quiet_end = Column(String(5), nullable=True, comment="방해금지 종료 (HH:MM)")

    # 타임스탬프
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

    # 관계
    user = relationship("User", back_populates="notification_preferences")

    # 인덱스
    __table_args__ = (
        Index('idx_notif_pref_user', 'user_id'),
    )

    def __repr__(self):
        return f"<NotificationPreference(user_id={self.user_id})>"

    def is_quiet_time(self, current_time: time) -> bool:
        """
        현재 시간이 방해금지 시간인지 확인

        Args:
            current_time: 확인할 시간

        Returns:
            방해금지 시간이면 True
        """
        if not self.quiet_start or not self.quiet_end:
            return False

        try:
            start_parts = self.quiet_start.split(":")
            end_parts = self.quiet_end.split(":")
            start = time(int(start_parts[0]), int(start_parts[1]))
            end = time(int(end_parts[0]), int(end_parts[1]))

            # 자정을 넘는 경우 (예: 22:00 ~ 07:00)
            if start > end:
                return current_time >= start or current_time <= end
            else:
                return start <= current_time <= end
        except (ValueError, IndexError):
            return False


class NewsSubscription(Base):
    """
    뉴스 구독 모델

    사용자별 뉴스 소스 구독 및 키워드 필터를 저장합니다.

    Attributes:
        id: 구독 고유 ID
        user_id: 구독한 사용자
        source: 뉴스 소스 이름 (CoinDesk, CoinTelegraph 등)
        keywords: 키워드 필터 (쉼표 구분 문자열)
        is_active: 활성 상태
        created_at: 생성 시간
    """
    __tablename__ = "news_subscriptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 사용자 정보
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="구독한 사용자"
    )

    # 구독 정보
    source = Column(
        String(100),
        nullable=False,
        comment="뉴스 소스 이름"
    )
    # SQLite 호환을 위해 키워드는 쉼표 구분 문자열로 저장
    keywords = Column(
        String(1000),
        nullable=True,
        comment="키워드 필터 (쉼표 구분)"
    )

    # 상태
    is_active = Column(Boolean, default=True, nullable=False, comment="활성 상태")

    # 타임스탬프
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="생성 시간"
    )

    # 관계
    user = relationship("User", back_populates="news_subscriptions")

    # 제약조건 및 인덱스
    __table_args__ = (
        UniqueConstraint('user_id', 'source', name='uq_user_source'),
        Index('idx_news_sub_user', 'user_id', 'is_active'),
        Index('idx_news_sub_source', 'source', 'is_active'),
    )

    def __repr__(self):
        return f"<NewsSubscription(user_id={self.user_id}, source={self.source})>"

    def get_keywords_list(self) -> list[str]:
        """
        키워드 문자열을 리스트로 변환

        Returns:
            키워드 리스트
        """
        if not self.keywords:
            return []
        return [kw.strip() for kw in self.keywords.split(",") if kw.strip()]

    def set_keywords_list(self, keywords: list[str]):
        """
        키워드 리스트를 문자열로 변환하여 저장

        Args:
            keywords: 키워드 리스트
        """
        self.keywords = ",".join(keywords) if keywords else None

    def matches_content(self, content: str) -> bool:
        """
        콘텐츠가 키워드와 일치하는지 확인

        Args:
            content: 확인할 콘텐츠

        Returns:
            키워드가 없거나 일치하면 True
        """
        keywords = self.get_keywords_list()
        if not keywords:
            return True  # 키워드 필터가 없으면 모든 뉴스 허용

        content_lower = content.lower()
        return any(keyword.lower() in content_lower for keyword in keywords)
