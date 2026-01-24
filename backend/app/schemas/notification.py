"""
알림 시스템 Pydantic 스키마
Notification, PriceAlert, NotificationPreference, NewsSubscription
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator
import json


# ============================================================
# Notification Schemas
# ============================================================

class NotificationBase(BaseModel):
    """알림 기본 스키마"""
    type: str = Field(
        default="system",
        description="알림 유형 (price_alert, news, system)"
    )
    title: str = Field(..., min_length=1, max_length=255, description="알림 제목")
    message: str = Field(..., min_length=1, description="알림 내용")
    priority: str = Field(
        default="medium",
        description="우선순위 (low, medium, high, urgent)"
    )

    @field_validator('type')
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = ['price_alert', 'news', 'system']
        if v not in allowed:
            raise ValueError(f'type must be one of {allowed}')
        return v

    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v: str) -> str:
        allowed = ['low', 'medium', 'high', 'urgent']
        if v not in allowed:
            raise ValueError(f'priority must be one of {allowed}')
        return v


class NotificationCreate(NotificationBase):
    """알림 생성 스키마 (내부 사용)"""
    user_id: int = Field(..., description="수신자 ID")
    data: Optional[dict[str, Any]] = Field(None, description="추가 메타데이터")
    expires_at: Optional[datetime] = Field(None, description="만료 시간")


class NotificationResponse(BaseModel):
    """알림 응답 스키마"""
    id: int
    type: str
    title: str
    message: str
    data: Optional[dict[str, Any]] = None
    priority: str
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @field_validator('data', mode='before')
    @classmethod
    def parse_data(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v


class NotificationListResponse(BaseModel):
    """알림 목록 응답 스키마"""
    items: list[NotificationResponse]
    total: int
    unread_count: int


class NotificationMarkReadRequest(BaseModel):
    """알림 읽음 처리 요청"""
    notification_ids: list[int] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="읽음 처리할 알림 ID 목록"
    )


class UnreadCountResponse(BaseModel):
    """읽지 않은 알림 수 응답"""
    count: int


# ============================================================
# Price Alert Schemas
# ============================================================

class PriceAlertBase(BaseModel):
    """가격 알림 기본 스키마"""
    symbol: str = Field(
        ...,
        min_length=1,
        max_length=20,
        description="심볼 (BTCUSDT 등)"
    )
    condition: str = Field(
        default="above",
        description="조건 (above, below, cross)"
    )
    target_price: Decimal = Field(
        ...,
        gt=0,
        description="목표 가격"
    )

    @field_validator('symbol')
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        return v.upper()

    @field_validator('condition')
    @classmethod
    def validate_condition(cls, v: str) -> str:
        allowed = ['above', 'below', 'cross']
        if v not in allowed:
            raise ValueError(f'condition must be one of {allowed}')
        return v


class PriceAlertCreate(PriceAlertBase):
    """가격 알림 생성 요청"""
    is_recurring: bool = Field(default=False, description="반복 알림 여부")
    cooldown_mins: int = Field(
        default=60,
        ge=1,
        le=1440,
        description="재알림 대기 시간 (분)"
    )
    note: Optional[str] = Field(None, max_length=500, description="사용자 메모")


class PriceAlertUpdate(BaseModel):
    """가격 알림 수정 요청"""
    symbol: Optional[str] = Field(None, min_length=1, max_length=20)
    condition: Optional[str] = None
    target_price: Optional[Decimal] = Field(None, gt=0)
    is_active: Optional[bool] = None
    is_recurring: Optional[bool] = None
    cooldown_mins: Optional[int] = Field(None, ge=1, le=1440)
    note: Optional[str] = Field(None, max_length=500)

    @field_validator('symbol')
    @classmethod
    def validate_symbol(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.upper()
        return v

    @field_validator('condition')
    @classmethod
    def validate_condition(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = ['above', 'below', 'cross']
            if v not in allowed:
                raise ValueError(f'condition must be one of {allowed}')
        return v


class PriceAlertResponse(BaseModel):
    """가격 알림 응답 스키마"""
    id: int
    symbol: str
    condition: str
    target_price: Decimal
    is_active: bool
    is_triggered: bool
    triggered_at: Optional[datetime] = None
    is_recurring: bool
    cooldown_mins: int
    last_notified: Optional[datetime] = None
    note: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PriceAlertListResponse(BaseModel):
    """가격 알림 목록 응답"""
    items: list[PriceAlertResponse]
    total: int


# ============================================================
# Notification Preference Schemas
# ============================================================

class NotificationPreferenceBase(BaseModel):
    """알림 설정 기본 스키마"""
    price_alerts: bool = Field(default=True, description="가격 알림 활성화")
    news_alerts: bool = Field(default=True, description="뉴스 알림 활성화")
    system_alerts: bool = Field(default=True, description="시스템 알림 활성화")
    email_enabled: bool = Field(default=False, description="이메일 알림")
    push_enabled: bool = Field(default=False, description="푸시 알림")
    quiet_start: Optional[str] = Field(
        None,
        pattern=r'^([01]\d|2[0-3]):[0-5]\d$',
        description="방해금지 시작 (HH:MM)"
    )
    quiet_end: Optional[str] = Field(
        None,
        pattern=r'^([01]\d|2[0-3]):[0-5]\d$',
        description="방해금지 종료 (HH:MM)"
    )


class NotificationPreferenceUpdate(BaseModel):
    """알림 설정 수정 요청"""
    price_alerts: Optional[bool] = None
    news_alerts: Optional[bool] = None
    system_alerts: Optional[bool] = None
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    quiet_start: Optional[str] = Field(
        None,
        pattern=r'^([01]\d|2[0-3]):[0-5]\d$'
    )
    quiet_end: Optional[str] = Field(
        None,
        pattern=r'^([01]\d|2[0-3]):[0-5]\d$'
    )


class NotificationPreferenceResponse(NotificationPreferenceBase):
    """알림 설정 응답 스키마"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# News Subscription Schemas
# ============================================================

class NewsSubscriptionBase(BaseModel):
    """뉴스 구독 기본 스키마"""
    source: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="뉴스 소스 이름"
    )
    keywords: Optional[list[str]] = Field(
        None,
        max_length=10,
        description="키워드 필터 (최대 10개)"
    )

    @field_validator('keywords')
    @classmethod
    def validate_keywords(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is not None:
            # 각 키워드 길이 제한
            for kw in v:
                if len(kw) > 50:
                    raise ValueError('각 키워드는 50자 이하여야 합니다')
            # 중복 제거
            return list(set(v))
        return v


class NewsSubscriptionCreate(NewsSubscriptionBase):
    """뉴스 구독 생성 요청"""
    pass


class NewsSubscriptionUpdate(BaseModel):
    """뉴스 구독 수정 요청"""
    keywords: Optional[list[str]] = Field(None, max_length=10)
    is_active: Optional[bool] = None

    @field_validator('keywords')
    @classmethod
    def validate_keywords(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is not None:
            for kw in v:
                if len(kw) > 50:
                    raise ValueError('각 키워드는 50자 이하여야 합니다')
            return list(set(v))
        return v


class NewsSubscriptionResponse(BaseModel):
    """뉴스 구독 응답 스키마"""
    id: int
    source: str
    keywords: Optional[list[str]] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator('keywords', mode='before')
    @classmethod
    def parse_keywords(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return [kw.strip() for kw in v.split(',') if kw.strip()]
        return v


class NewsSubscriptionListResponse(BaseModel):
    """뉴스 구독 목록 응답"""
    items: list[NewsSubscriptionResponse]
    total: int


# ============================================================
# WebSocket Message Schemas
# ============================================================

class WebSocketNotification(BaseModel):
    """WebSocket 알림 메시지"""
    type: str
    id: str
    timestamp: datetime
    priority: str
    data: dict[str, Any]
    title: str
    message: str
