"""
알림 시스템 모델 정의
Notification, PriceAlert 모델
"""
from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    Column, Integer, String, DateTime, Text, Boolean,
    ForeignKey, Index, Numeric, Enum as SQLEnum
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class NotificationType(str, enum.Enum):
    """알림 유형"""
    PRICE_ALERT = "price_alert"
    NEWS = "news"
    SYSTEM = "system"


class NotificationPriority(str, enum.Enum):
    """알림 우선순위"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class AlertCondition(str, enum.Enum):
    """가격 알림 조건"""
    ABOVE = "above"      # 목표가 이상
    BELOW = "below"      # 목표가 이하
    CROSS = "cross"      # 목표가 교차 (상승/하락 모두)


class Notification(Base):
    """
    알림 모델

    사용자에게 전달되는 모든 알림을 저장합니다.

    Attributes:
        id: 알림 고유 ID
        user_id: 알림 수신 사용자
        type: 알림 유형 (price_alert, news, system)
        title: 알림 제목
        message: 알림 내용
        data: 추가 메타데이터 (JSON)
        priority: 우선순위 (low, medium, high, urgent)
        is_read: 읽음 여부
        read_at: 읽은 시간
        created_at: 생성 시간
        expires_at: 만료 시간 (optional)
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 수신자 정보
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="알림 수신 사용자"
    )

    # 알림 내용
    type = Column(
        String(50),
        nullable=False,
        default=NotificationType.SYSTEM.value,
        comment="알림 유형 (price_alert, news, system)"
    )
    title = Column(String(255), nullable=False, comment="알림 제목")
    message = Column(Text, nullable=False, comment="알림 내용")
    data = Column(Text, nullable=True, comment="추가 메타데이터 (JSON)")

    # 우선순위 및 상태
    priority = Column(
        String(20),
        nullable=False,
        default=NotificationPriority.MEDIUM.value,
        comment="우선순위 (low, medium, high, urgent)"
    )
    is_read = Column(Boolean, default=False, nullable=False, comment="읽음 여부")
    read_at = Column(DateTime, nullable=True, comment="읽은 시간")

    # 타임스탬프
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="생성 시간"
    )
    expires_at = Column(DateTime, nullable=True, comment="만료 시간")

    # 관계
    user = relationship("User", back_populates="notifications")

    # 인덱스
    __table_args__ = (
        Index('idx_notif_user_unread', 'user_id', 'is_read', 'created_at'),
        Index('idx_notif_type', 'type', 'created_at'),
        Index('idx_notif_expires', 'expires_at'),
    )

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.type})>"


class PriceAlert(Base):
    """
    가격 알림 모델

    사용자가 설정한 가격 알림 규칙을 저장합니다.

    Attributes:
        id: 알림 규칙 고유 ID
        user_id: 설정한 사용자
        symbol: 심볼 (BTCUSDT, ETHUSDT 등)
        condition: 조건 (above, below, cross)
        target_price: 목표 가격
        is_active: 활성 상태
        is_triggered: 트리거 여부
        triggered_at: 트리거된 시간
        is_recurring: 반복 알림 여부
        cooldown_mins: 재알림 대기 시간 (분)
        last_notified: 마지막 알림 발송 시간
        note: 사용자 메모
        created_at: 생성 시간
        updated_at: 수정 시간
    """
    __tablename__ = "price_alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 사용자 정보
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="설정한 사용자"
    )

    # 알림 조건
    symbol = Column(String(20), nullable=False, comment="심볼 (BTCUSDT 등)")
    condition = Column(
        String(20),
        nullable=False,
        default=AlertCondition.ABOVE.value,
        comment="조건 (above, below, cross)"
    )
    target_price = Column(
        Numeric(20, 8),
        nullable=False,
        comment="목표 가격"
    )

    # 상태
    is_active = Column(Boolean, default=True, nullable=False, comment="활성 상태")
    is_triggered = Column(Boolean, default=False, nullable=False, comment="트리거 여부")
    triggered_at = Column(DateTime, nullable=True, comment="트리거된 시간")

    # 반복 설정
    is_recurring = Column(Boolean, default=False, nullable=False, comment="반복 알림 여부")
    cooldown_mins = Column(Integer, default=60, nullable=False, comment="재알림 대기 시간 (분)")
    last_notified = Column(DateTime, nullable=True, comment="마지막 알림 발송 시간")

    # 추가 정보
    note = Column(String(500), nullable=True, comment="사용자 메모")

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
    user = relationship("User", back_populates="price_alerts")

    # 인덱스
    __table_args__ = (
        Index('idx_alert_active_symbol', 'is_active', 'symbol'),
        Index('idx_alert_user', 'user_id', 'is_active'),
        Index('idx_alert_check', 'is_active', 'is_triggered', 'symbol'),
    )

    def __repr__(self):
        return f"<PriceAlert(id={self.id}, symbol={self.symbol}, target={self.target_price})>"
