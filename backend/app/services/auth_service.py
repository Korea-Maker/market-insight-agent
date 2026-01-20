"""
인증 서비스
회원가입, 로그인, OAuth 처리
"""
import logging
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.models.user import User, OAuthAccount
from app.schemas.user import UserCreate
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.core.config import settings

logger = logging.getLogger(__name__)


class AuthService:
    """인증 관련 비즈니스 로직"""

    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """이메일로 사용자 조회"""
        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        """사용자명으로 사용자 조회"""
        result = await db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        """ID로 사용자 조회"""
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def check_email_or_username_exists(
        db: AsyncSession,
        email: str,
        username: str,
    ) -> Tuple[bool, bool]:
        """
        이메일 또는 사용자명 중복 체크

        Returns:
            (email_exists, username_exists)
        """
        result = await db.execute(
            select(User).where(
                or_(User.email == email, User.username == username)
            )
        )
        users = result.scalars().all()

        email_exists = any(u.email == email for u in users)
        username_exists = any(u.username == username for u in users)

        return email_exists, username_exists

    @staticmethod
    async def create_user(
        db: AsyncSession,
        user_data: UserCreate,
    ) -> User:
        """
        새 사용자 생성 (이메일/비밀번호 방식)

        Args:
            db: 데이터베이스 세션
            user_data: 회원가입 데이터

        Returns:
            생성된 User 객체
        """
        password_hash = get_password_hash(user_data.password)

        user = User(
            email=user_data.email,
            username=user_data.username.lower(),
            display_name=user_data.display_name,
            password_hash=password_hash,
            is_active=True,
            is_verified=False,  # 이메일 인증 필요
        )

        db.add(user)
        await db.commit()
        await db.refresh(user)

        logger.info(f"새 사용자 생성: {user.username} ({user.email})")
        return user

    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        email: str,
        password: str,
    ) -> Optional[User]:
        """
        이메일/비밀번호로 사용자 인증

        Args:
            db: 데이터베이스 세션
            email: 이메일
            password: 비밀번호

        Returns:
            인증된 User 객체 또는 None
        """
        user = await AuthService.get_user_by_email(db, email)

        if user is None:
            return None

        if user.password_hash is None:
            # OAuth 전용 계정
            return None

        if not verify_password(password, user.password_hash):
            return None

        if not user.is_active:
            return None

        return user

    @staticmethod
    def create_tokens(user_id: int) -> Tuple[str, str, int]:
        """
        액세스/리프레시 토큰 생성

        Args:
            user_id: 사용자 ID

        Returns:
            (access_token, refresh_token, expires_in_seconds)
        """
        access_token = create_access_token(subject=user_id)
        refresh_token = create_refresh_token(subject=user_id)
        expires_in = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60

        return access_token, refresh_token, expires_in

    @staticmethod
    async def get_or_create_oauth_user(
        db: AsyncSession,
        provider: str,
        provider_id: str,
        email: str,
        display_name: str,
        avatar_url: Optional[str] = None,
    ) -> Tuple[User, bool]:
        """
        OAuth 사용자 조회 또는 생성

        Args:
            db: 데이터베이스 세션
            provider: OAuth 제공자 (google, github)
            provider_id: 제공자 측 사용자 ID
            email: 이메일
            display_name: 표시 이름
            avatar_url: 프로필 이미지 URL

        Returns:
            (User 객체, is_new_user)
        """
        # 기존 OAuth 계정 조회
        result = await db.execute(
            select(OAuthAccount).where(
                OAuthAccount.provider == provider,
                OAuthAccount.provider_id == provider_id,
            )
        )
        oauth_account = result.scalar_one_or_none()

        if oauth_account:
            # 기존 계정 반환
            user = await AuthService.get_user_by_id(db, oauth_account.user_id)
            return user, False

        # 이메일로 기존 사용자 조회
        user = await AuthService.get_user_by_email(db, email)

        if user:
            # 기존 사용자에 OAuth 계정 연결
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider=provider,
                provider_id=provider_id,
            )
            db.add(oauth_account)
            await db.commit()
            logger.info(f"OAuth 계정 연결: {user.username} <- {provider}")
            return user, False

        # 새 사용자 생성
        # 사용자명 생성 (이메일 앞부분 + 랜덤)
        import secrets
        base_username = email.split("@")[0][:20]
        username = f"{base_username}_{secrets.token_hex(4)}"

        user = User(
            email=email,
            username=username.lower(),
            display_name=display_name,
            avatar_url=avatar_url,
            is_active=True,
            is_verified=True,  # OAuth는 이미 인증됨
        )

        db.add(user)
        await db.flush()  # user.id 생성

        # OAuth 계정 연결
        oauth_account = OAuthAccount(
            user_id=user.id,
            provider=provider,
            provider_id=provider_id,
        )
        db.add(oauth_account)

        await db.commit()
        await db.refresh(user)

        logger.info(f"새 OAuth 사용자 생성: {user.username} ({provider})")
        return user, True
