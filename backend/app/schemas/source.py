"""
정보 소스 관련 Pydantic 스키마
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, HttpUrl, field_validator


class SourceBase(BaseModel):
    """소스 기본 스키마"""
    name: str = Field(..., min_length=1, max_length=100)
    source_type: str = Field(default="rss", max_length=50)
    url: HttpUrl
    is_enabled: bool = Field(default=True)
    fetch_interval_seconds: int = Field(default=600, ge=60, le=86400)  # 1분 ~ 24시간

    @field_validator('source_type')
    @classmethod
    def validate_source_type(cls, v: str) -> str:
        allowed_types = ['rss', 'api', 'webhook']
        if v.lower() not in allowed_types:
            raise ValueError(f'source_type은 {allowed_types} 중 하나여야 합니다')
        return v.lower()


class SourceCreate(BaseModel):
    """소스 생성 요청 스키마"""
    name: str = Field(..., min_length=1, max_length=100)
    source_type: str = Field(default="rss", max_length=50)
    url: HttpUrl
    is_enabled: bool = Field(default=True)
    fetch_interval_seconds: int = Field(default=600, ge=60, le=86400)

    @field_validator('source_type')
    @classmethod
    def validate_source_type(cls, v: str) -> str:
        allowed_types = ['rss', 'api', 'webhook']
        if v.lower() not in allowed_types:
            raise ValueError(f'source_type은 {allowed_types} 중 하나여야 합니다')
        return v.lower()


class SourceUpdate(BaseModel):
    """소스 수정 요청 스키마"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    source_type: Optional[str] = Field(None, max_length=50)
    url: Optional[HttpUrl] = None
    is_enabled: Optional[bool] = None
    fetch_interval_seconds: Optional[int] = Field(None, ge=60, le=86400)

    @field_validator('source_type')
    @classmethod
    def validate_source_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed_types = ['rss', 'api', 'webhook']
        if v.lower() not in allowed_types:
            raise ValueError(f'source_type은 {allowed_types} 중 하나여야 합니다')
        return v.lower()


class SourceResponse(BaseModel):
    """소스 응답 스키마 (전체 필드 포함)"""
    id: int
    name: str
    source_type: str
    url: str
    is_enabled: bool
    fetch_interval_seconds: int

    # 상태 추적 필드
    last_fetch_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    success_count: int = 0
    failure_count: int = 0
    last_error: Optional[str] = None

    # 메타데이터
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SourceListItem(BaseModel):
    """소스 목록 아이템 스키마 (간략 정보)"""
    id: int
    name: str
    source_type: str
    url: str
    is_enabled: bool
    last_fetch_at: Optional[datetime] = None
    success_count: int = 0
    failure_count: int = 0

    class Config:
        from_attributes = True


class SourceListResponse(BaseModel):
    """소스 목록 응답 스키마"""
    items: List[SourceListItem]
    total: int
    skip: int
    limit: int


# 지원되는 소스 타입 목록
SOURCE_TYPES = [
    {"type": "rss", "name": "RSS Feed", "description": "RSS/Atom 피드 수집"},
    {"type": "api", "name": "REST API", "description": "REST API 폴링 (미래 확장용)"},
    {"type": "webhook", "name": "Webhook", "description": "웹훅 수신 (미래 확장용)"},
]
