"""
인증 관련 Pydantic 스키마
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    """로그인 요청 스키마"""
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    """토큰 응답 스키마"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # 초 단위


class LoginResponse(TokenResponse):
    """로그인 응답 스키마"""
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """토큰 갱신 요청 스키마"""
    refresh_token: str


class RegisterResponse(BaseModel):
    """회원가입 응답 스키마"""
    id: int
    email: EmailStr
    username: str
    display_name: str
    message: str = "회원가입이 완료되었습니다"


class PasswordResetRequest(BaseModel):
    """비밀번호 재설정 요청 스키마"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """비밀번호 재설정 확인 스키마"""
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)


class EmailVerifyRequest(BaseModel):
    """이메일 인증 요청 스키마"""
    token: str


class OAuthCallbackResponse(BaseModel):
    """OAuth 콜백 응답 스키마"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    is_new_user: bool = False
