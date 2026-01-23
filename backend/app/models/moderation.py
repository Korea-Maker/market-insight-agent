"""
관리자 기능 관련 모델 정의
Report, ModerationLog, UserWarning 모델
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Index, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Report(Base):
    """
    신고 모델

    Attributes:
        id: 신고 ID
        reporter_id: 신고자 ID
        target_type: 대상 유형 (post, comment, user)
        target_id: 대상 ID
        reason: 신고 사유
        description: 상세 설명
        status: 처리 상태 (pending, reviewed, resolved, dismissed)
        priority: 우선순위 (low, medium, high, critical)
        reviewed_by_id: 처리자 ID
        reviewed_at: 처리 시간
        resolution_note: 처리 메모
        created_at: 신고 시간
    """
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 신고자
    reporter_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="신고자"
    )

    # 대상 정보
    target_type = Column(String(20), nullable=False, comment="대상 유형 (post, comment, user)")
    target_id = Column(Integer, nullable=False, comment="대상 ID")

    # 신고 내용
    reason = Column(String(50), nullable=False, comment="신고 사유")
    description = Column(Text, nullable=True, comment="상세 설명")

    # 상태
    status = Column(String(20), default='pending', nullable=False, comment="처리 상태")
    priority = Column(String(20), default='medium', nullable=False, comment="우선순위")

    # 처리 정보
    reviewed_by_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="처리자"
    )
    reviewed_at = Column(DateTime, nullable=True, comment="처리 시간")
    resolution_note = Column(Text, nullable=True, comment="처리 메모")

    # 메타데이터
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="신고 시간"
    )

    # 관계
    reporter = relationship(
        "User",
        foreign_keys=[reporter_id],
        backref="reports_filed"
    )
    reviewed_by = relationship(
        "User",
        foreign_keys=[reviewed_by_id],
        backref="reports_reviewed"
    )

    # 인덱스
    __table_args__ = (
        Index('idx_reports_status', 'status'),
        Index('idx_reports_priority', 'priority'),
        Index('idx_reports_target', 'target_type', 'target_id'),
        Index('idx_reports_created_at', 'created_at'),
        Index('idx_reports_reporter', 'reporter_id'),
    )

    def __repr__(self):
        return f"<Report(id={self.id}, target_type={self.target_type}, target_id={self.target_id}, status={self.status})>"


class ModerationLog(Base):
    """
    관리 활동 로그 모델

    Attributes:
        id: 로그 ID
        moderator_id: 관리자 ID
        action_type: 액션 유형
        target_type: 대상 유형 (user, post, comment, report)
        target_id: 대상 ID
        reason: 사유
        metadata: 추가 정보 (JSON)
        created_at: 활동 시간
    """
    __tablename__ = "moderation_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 관리자
    moderator_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="관리자"
    )

    # 액션 정보
    action_type = Column(String(50), nullable=False, comment="액션 유형")
    target_type = Column(String(20), nullable=False, comment="대상 유형")
    target_id = Column(Integer, nullable=False, comment="대상 ID")

    # 상세 정보
    reason = Column(Text, nullable=True, comment="사유")
    metadata = Column(JSON, nullable=True, comment="추가 정보")

    # 메타데이터
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="활동 시간"
    )

    # 관계
    moderator = relationship("User", backref="moderation_logs")

    # 인덱스
    __table_args__ = (
        Index('idx_moderation_logs_action', 'action_type'),
        Index('idx_moderation_logs_target', 'target_type', 'target_id'),
        Index('idx_moderation_logs_moderator', 'moderator_id'),
        Index('idx_moderation_logs_created_at', 'created_at'),
    )

    def __repr__(self):
        return f"<ModerationLog(id={self.id}, action={self.action_type}, target={self.target_type}:{self.target_id})>"


class UserWarning(Base):
    """
    사용자 경고 기록 모델

    Attributes:
        id: 경고 ID
        user_id: 대상 사용자 ID
        moderator_id: 경고를 부여한 관리자 ID
        reason: 경고 사유
        acknowledged: 사용자 확인 여부
        created_at: 경고 시간
    """
    __tablename__ = "user_warnings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 대상 사용자
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="대상 사용자"
    )

    # 관리자
    moderator_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="관리자"
    )

    # 경고 내용
    reason = Column(Text, nullable=False, comment="경고 사유")
    acknowledged = Column(Boolean, default=False, nullable=False, comment="사용자 확인 여부")

    # 메타데이터
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="경고 시간"
    )

    # 관계
    user = relationship(
        "User",
        foreign_keys=[user_id],
        backref="warnings_received"
    )
    moderator = relationship(
        "User",
        foreign_keys=[moderator_id],
        backref="warnings_given"
    )

    # 인덱스
    __table_args__ = (
        Index('idx_user_warnings_user', 'user_id'),
        Index('idx_user_warnings_created_at', 'created_at'),
    )

    def __repr__(self):
        return f"<UserWarning(id={self.id}, user_id={self.user_id}, acknowledged={self.acknowledged})>"
