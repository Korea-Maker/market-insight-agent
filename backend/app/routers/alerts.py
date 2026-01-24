"""
가격 알림 API 라우터
가격 알림 CRUD, 토글
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.notification import (
    PriceAlertCreate,
    PriceAlertUpdate,
    PriceAlertResponse,
    PriceAlertListResponse,
)
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=PriceAlertListResponse)
async def get_price_alerts(
    symbol: Optional[str] = Query(None, description="심볼 필터 (BTCUSDT 등)"),
    is_active: Optional[bool] = Query(None, description="활성 상태 필터"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    가격 알림 목록 조회

    - symbol: 심볼 필터
    - is_active: 활성 상태 필터
    """
    alerts = await NotificationService.get_price_alerts(
        db,
        user_id=current_user.id,
        symbol=symbol,
        is_active=is_active,
    )

    return PriceAlertListResponse(
        items=[PriceAlertResponse.model_validate(a) for a in alerts],
        total=len(alerts),
    )


@router.post("", response_model=PriceAlertResponse, status_code=status.HTTP_201_CREATED)
async def create_price_alert(
    alert_data: PriceAlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    가격 알림 생성

    - symbol: 심볼 (BTCUSDT 등)
    - condition: 조건 (above, below, cross)
    - target_price: 목표 가격
    - is_recurring: 반복 알림 여부 (기본: false)
    - cooldown_mins: 재알림 대기 시간 (분, 기본: 60)
    - note: 사용자 메모
    """
    try:
        alert = await NotificationService.create_price_alert(
            db, current_user.id, alert_data
        )
        return PriceAlertResponse.model_validate(alert)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/{alert_id}", response_model=PriceAlertResponse)
async def get_price_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """가격 알림 상세 조회"""
    alert = await NotificationService.get_price_alert_by_id(
        db, alert_id, current_user.id
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="가격 알림을 찾을 수 없습니다",
        )
    return PriceAlertResponse.model_validate(alert)


@router.put("/{alert_id}", response_model=PriceAlertResponse)
async def update_price_alert(
    alert_id: int,
    update_data: PriceAlertUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """가격 알림 수정"""
    alert = await NotificationService.get_price_alert_by_id(
        db, alert_id, current_user.id
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="가격 알림을 찾을 수 없습니다",
        )

    updated_alert = await NotificationService.update_price_alert(db, alert, update_data)
    return PriceAlertResponse.model_validate(updated_alert)


@router.delete("/{alert_id}")
async def delete_price_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """가격 알림 삭제"""
    deleted = await NotificationService.delete_price_alert(
        db, alert_id, current_user.id
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="가격 알림을 찾을 수 없습니다",
        )
    return {"message": "가격 알림이 삭제되었습니다"}


@router.post("/{alert_id}/toggle", response_model=PriceAlertResponse)
async def toggle_price_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """가격 알림 활성/비활성 토글"""
    alert = await NotificationService.toggle_price_alert(
        db, alert_id, current_user.id
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="가격 알림을 찾을 수 없습니다",
        )
    return PriceAlertResponse.model_validate(alert)
