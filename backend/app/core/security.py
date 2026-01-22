"""
보안 관련 유틸리티
JWT 토큰 생성/검증, 비밀번호 해싱
"""
from datetime import datetime, timedelta
from typing import Optional, Any
from jose import jwt, JWTError
import bcrypt

from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """비밀번호 해싱"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def create_access_token(
    subject: str | int,
    expires_delta: Optional[timedelta] = None,
    extra_data: Optional[dict[str, Any]] = None,
) -> str:
    """
    액세스 토큰 생성

    Args:
        subject: 토큰 주체 (보통 user_id)
        expires_delta: 만료 시간 (기본: 15분)
        extra_data: 추가 데이터

    Returns:
        JWT 토큰 문자열
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
    }

    if extra_data:
        to_encode.update(extra_data)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def create_refresh_token(
    subject: str | int,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    리프레시 토큰 생성

    Args:
        subject: 토큰 주체 (보통 user_id)
        expires_delta: 만료 시간 (기본: 7일)

    Returns:
        JWT 토큰 문자열
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """
    JWT 토큰 디코딩

    Args:
        token: JWT 토큰 문자열

    Returns:
        디코딩된 페이로드 또는 None (실패 시)
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None


def verify_access_token(token: str) -> Optional[int]:
    """
    액세스 토큰 검증 및 user_id 반환

    Args:
        token: JWT 토큰 문자열

    Returns:
        user_id 또는 None (실패 시)
    """
    payload = decode_token(token)
    if payload is None:
        return None

    if payload.get("type") != "access":
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    try:
        return int(user_id)
    except ValueError:
        return None


def verify_refresh_token(token: str) -> Optional[int]:
    """
    리프레시 토큰 검증 및 user_id 반환

    Args:
        token: JWT 토큰 문자열

    Returns:
        user_id 또는 None (실패 시)
    """
    payload = decode_token(token)
    if payload is None:
        return None

    if payload.get("type") != "refresh":
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    try:
        return int(user_id)
    except ValueError:
        return None
