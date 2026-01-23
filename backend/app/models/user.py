"""
사용자 모델 정의
User 및 OAuthAccount 모델
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    """
    사용자 모델

    Attributes:
        id: 사용자 고유 ID
        email: 이메일 주소 (유니크)
        username: 사용자명 (URL용, 유니크)
        password_hash: 비밀번호 해시 (OAuth 사용자는 NULL)
        display_name: 표시 이름
        avatar_url: 프로필 이미지 URL
        bio: 자기소개
        is_active: 활성 상태
        is_verified: 이메일 인증 여부
        created_at: 가입일
        updated_at: 수정일
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 인증 정보
    email = Column(String(255), unique=True, nullable=False, index=True, comment="이메일 주소")
    username = Column(String(50), unique=True, nullable=False, index=True, comment="사용자명 (URL용)")
    password_hash = Column(String(255), nullable=True, comment="비밀번호 해시")

    # 프로필 정보
    display_name = Column(String(100), nullable=False, comment="표시 이름")
    avatar_url = Column(String(500), nullable=True, comment="프로필 이미지 URL")
    bio = Column(Text, nullable=True, comment="자기소개")

    # 상태
    is_active = Column(Boolean, default=True, nullable=False, comment="활성 상태")
    is_verified = Column(Boolean, default=False, nullable=False, comment="이메일 인증 여부")

    # 관리 관련 필드
    role = Column(String(20), default='user', nullable=False, comment="역할 (user, moderator, admin)")
    status = Column(String(20), default='active', nullable=False, comment="상태 (active, warned, suspended, banned)")
    warning_count = Column(Integer, default=0, nullable=False, comment="경고 횟수")
    suspended_until = Column(DateTime, nullable=True, comment="정지 해제 시간")
    banned_at = Column(DateTime, nullable=True, comment="차단 시간")
    ban_reason = Column(Text, nullable=True, comment="차단 사유")
    last_active_at = Column(DateTime, nullable=True, comment="마지막 활동 시간")

    # 메타데이터
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="가입일"
    )
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="수정일"
    )

    # 관계
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    post_likes = relationship("PostLike", back_populates="user", cascade="all, delete-orphan")

    # 알림 관련 관계
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    price_alerts = relationship("PriceAlert", back_populates="user", cascade="all, delete-orphan")
    notification_preferences = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    news_subscriptions = relationship("NewsSubscription", back_populates="user", cascade="all, delete-orphan")

    # 인덱스
    __table_args__ = (
        Index('idx_users_email', 'email'),
        Index('idx_users_username', 'username'),
        Index('idx_users_created_at', 'created_at'),
    )

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email})>"


class OAuthAccount(Base):
    """
    OAuth 계정 연동 모델

    Attributes:
        id: 고유 ID
        user_id: 연결된 사용자
        provider: OAuth 제공자 (google, github)
        provider_id: 제공자 측 사용자 ID
        access_token: 액세스 토큰
        refresh_token: 리프레시 토큰
        created_at: 연동일
    """
    __tablename__ = "oauth_accounts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 연결 정보
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="연결된 사용자")
    provider = Column(String(50), nullable=False, comment="OAuth 제공자")
    provider_id = Column(String(255), nullable=False, comment="제공자 측 사용자 ID")

    # 토큰 (암호화 저장 권장)
    access_token = Column(String(500), nullable=True, comment="액세스 토큰")
    refresh_token = Column(String(500), nullable=True, comment="리프레시 토큰")

    # 메타데이터
    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
        comment="연동일"
    )

    # 관계
    user = relationship("User", back_populates="oauth_accounts")

    # 인덱스 (provider + provider_id 유니크)
    __table_args__ = (
        Index('idx_oauth_provider_id', 'provider', 'provider_id', unique=True),
    )

    def __repr__(self):
        return f"<OAuthAccount(id={self.id}, provider={self.provider}, user_id={self.user_id})>"
