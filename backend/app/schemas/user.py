"""
사용자 관련 Pydantic 스키마
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class UserBase(BaseModel):
    """사용자 기본 스키마"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('사용자명은 영문, 숫자, 언더스코어만 사용할 수 있습니다')
        return v.lower()


class UserCreate(UserBase):
    """회원가입 요청 스키마"""
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError('비밀번호는 대문자를 포함해야 합니다')
        if not re.search(r'[a-z]', v):
            raise ValueError('비밀번호는 소문자를 포함해야 합니다')
        if not re.search(r'[0-9]', v):
            raise ValueError('비밀번호는 숫자를 포함해야 합니다')
        return v


class UserUpdate(BaseModel):
    """프로필 수정 요청 스키마"""
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=500)


class UserResponse(BaseModel):
    """사용자 응답 스키마"""
    id: int
    email: EmailStr
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserPublicResponse(BaseModel):
    """공개 사용자 프로필 응답 스키마"""
    id: int
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserStats(BaseModel):
    """사용자 활동 통계"""
    post_count: int = 0
    comment_count: int = 0
    total_likes: int = 0


class UserWithStats(UserResponse):
    """통계 포함 사용자 응답"""
    stats: UserStats


class AuthorResponse(BaseModel):
    """게시글/댓글 작성자 간략 정보"""
    id: int
    username: str
    display_name: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True
