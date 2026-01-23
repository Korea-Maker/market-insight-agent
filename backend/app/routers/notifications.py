"""
알림 API 라우터
알림 조회, 읽음 처리, 삭제
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    NotificationMarkReadRequest,
    UnreadCountResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    NewsSubscriptionCreate,
    NewsSubscriptionUpdate,
    NewsSubscriptionResponse,
    NewsSubscriptionListResponse,
)
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# ============================================================
# Notifications
# ============================================================

@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None, description="알림 유형 필터 (price_alert, news, system)"),
    is_read: Optional[bool] = Query(None, description="읽음 여부 필터"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    알림 목록 조회

    - skip: 건너뛸 개수 (기본: 0)
    - limit: 조회할 개수 (기본: 20, 최대: 100)
    - type: 알림 유형 필터
    - is_read: 읽음 여부 필터
    """
    notifications, total, unread_count = await NotificationService.get_notifications(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        notification_type=type,
        is_read=is_read,
    )

    return NotificationListResponse(
        items=[NotificationResponse.model_validate(n) for n in notifications],
        total=total,
        unread_count=unread_count,
    )


@router.get("/unread", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """읽지 않은 알림 수 조회"""
    count = await NotificationService.get_unread_count(db, current_user.id)
    return UnreadCountResponse(count=count)


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """알림 상세 조회"""
    notification = await NotificationService.get_notification_by_id(
        db, notification_id, current_user.id
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="알림을 찾을 수 없습니다",
        )
    return NotificationResponse.model_validate(notification)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """알림 읽음 처리"""
    notification = await NotificationService.get_notification_by_id(
        db, notification_id, current_user.id
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="알림을 찾을 수 없습니다",
        )

    await NotificationService.mark_as_read(db, [notification_id], current_user.id)

    # 업데이트된 알림 다시 조회
    notification = await NotificationService.get_notification_by_id(
        db, notification_id, current_user.id
    )
    return NotificationResponse.model_validate(notification)


@router.post("/mark-read")
async def mark_notifications_as_read(
    request: NotificationMarkReadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """여러 알림 읽음 처리"""
    count = await NotificationService.mark_as_read(
        db, request.notification_ids, current_user.id
    )
    return {"message": f"{count}개의 알림이 읽음 처리되었습니다", "count": count}


@router.post("/mark-all-read")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """모든 알림 읽음 처리"""
    count = await NotificationService.mark_all_as_read(db, current_user.id)
    return {"message": f"{count}개의 알림이 읽음 처리되었습니다", "count": count}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """알림 삭제"""
    deleted = await NotificationService.delete_notification(
        db, notification_id, current_user.id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="알림을 찾을 수 없습니다",
        )
    return {"message": "알림이 삭제되었습니다"}


# ============================================================
# Notification Preferences
# ============================================================

@router.get("/preferences", response_model=NotificationPreferenceResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """알림 설정 조회"""
    pref = await NotificationService.get_or_create_preferences(db, current_user.id)
    return NotificationPreferenceResponse.model_validate(pref)


@router.put("/preferences", response_model=NotificationPreferenceResponse)
async def update_notification_preferences(
    update_data: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """알림 설정 수정"""
    pref = await NotificationService.update_preferences(
        db, current_user.id, update_data
    )
    return NotificationPreferenceResponse.model_validate(pref)


# ============================================================
# News Subscriptions
# ============================================================

@router.get("/subscriptions", response_model=NewsSubscriptionListResponse)
async def get_news_subscriptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """뉴스 구독 목록 조회"""
    subscriptions = await NotificationService.get_news_subscriptions(db, current_user.id)
    return NewsSubscriptionListResponse(
        items=[NewsSubscriptionResponse.model_validate(s) for s in subscriptions],
        total=len(subscriptions),
    )


@router.post("/subscriptions", response_model=NewsSubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_news_subscription(
    sub_data: NewsSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """뉴스 소스 구독"""
    try:
        subscription = await NotificationService.create_news_subscription(
            db, current_user.id, sub_data
        )
        return NewsSubscriptionResponse.model_validate(subscription)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put("/subscriptions/{subscription_id}", response_model=NewsSubscriptionResponse)
async def update_news_subscription(
    subscription_id: int,
    update_data: NewsSubscriptionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """뉴스 구독 수정"""
    subscription = await NotificationService.update_news_subscription(
        db, subscription_id, current_user.id, update_data
    )
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="구독을 찾을 수 없습니다",
        )
    return NewsSubscriptionResponse.model_validate(subscription)


@router.delete("/subscriptions/{source}")
async def delete_news_subscription(
    source: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """뉴스 구독 해제"""
    deleted = await NotificationService.delete_news_subscription(
        db, source, current_user.id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="구독을 찾을 수 없습니다",
        )
    return {"message": f"'{source}' 구독이 해제되었습니다"}
