"""
알림 서비스
알림 CRUD, 가격 알림, 알림 설정 관리
"""
import json
import logging
from datetime import datetime
from typing import Optional, Tuple
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import selectinload

from app.models.notification import Notification, PriceAlert
from app.models.notification_pref import NotificationPreference, NewsSubscription
from app.schemas.notification import (
    NotificationCreate,
    PriceAlertCreate,
    PriceAlertUpdate,
    NotificationPreferenceUpdate,
    NewsSubscriptionCreate,
    NewsSubscriptionUpdate,
)

logger = logging.getLogger(__name__)


class NotificationService:
    """알림 관련 비즈니스 로직"""

    # ============================================================
    # Notification CRUD
    # ============================================================

    @staticmethod
    async def create_notification(
        db: AsyncSession,
        notification_data: NotificationCreate,
    ) -> Notification:
        """
        알림 생성

        Args:
            db: 데이터베이스 세션
            notification_data: 알림 생성 데이터

        Returns:
            생성된 알림 객체
        """
        notification = Notification(
            user_id=notification_data.user_id,
            type=notification_data.type,
            title=notification_data.title,
            message=notification_data.message,
            data=json.dumps(notification_data.data) if notification_data.data else None,
            priority=notification_data.priority,
            expires_at=notification_data.expires_at,
        )

        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        logger.info(f"알림 생성: id={notification.id}, user_id={notification.user_id}, type={notification.type}")
        return notification

    @staticmethod
    async def get_notifications(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 20,
        notification_type: Optional[str] = None,
        is_read: Optional[bool] = None,
    ) -> Tuple[list[Notification], int, int]:
        """
        사용자 알림 목록 조회

        Args:
            db: 데이터베이스 세션
            user_id: 사용자 ID
            skip: 건너뛸 개수
            limit: 조회할 개수
            notification_type: 알림 유형 필터
            is_read: 읽음 여부 필터

        Returns:
            (알림 목록, 전체 개수, 읽지 않은 개수)
        """
        # 기본 쿼리
        query = select(Notification).where(Notification.user_id == user_id)
        count_query = select(func.count(Notification.id)).where(Notification.user_id == user_id)

        # 타입 필터
        if notification_type:
            query = query.where(Notification.type == notification_type)
            count_query = count_query.where(Notification.type == notification_type)

        # 읽음 여부 필터
        if is_read is not None:
            query = query.where(Notification.is_read == is_read)
            count_query = count_query.where(Notification.is_read == is_read)

        # 만료되지 않은 알림만
        now = datetime.utcnow()
        query = query.where(
            (Notification.expires_at.is_(None)) | (Notification.expires_at > now)
        )
        count_query = count_query.where(
            (Notification.expires_at.is_(None)) | (Notification.expires_at > now)
        )

        # 정렬 및 페이지네이션
        query = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)

        # 실행
        result = await db.execute(query)
        notifications = list(result.scalars().all())

        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        # 읽지 않은 알림 수
        unread_query = select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read == False,
            (Notification.expires_at.is_(None)) | (Notification.expires_at > now),
        )
        unread_result = await db.execute(unread_query)
        unread_count = unread_result.scalar() or 0

        return notifications, total, unread_count

    @staticmethod
    async def get_notification_by_id(
        db: AsyncSession,
        notification_id: int,
        user_id: int,
    ) -> Optional[Notification]:
        """알림 조회"""
        result = await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_unread_count(db: AsyncSession, user_id: int) -> int:
        """읽지 않은 알림 수 조회"""
        now = datetime.utcnow()
        result = await db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read == False,
                (Notification.expires_at.is_(None)) | (Notification.expires_at > now),
            )
        )
        return result.scalar() or 0

    @staticmethod
    async def mark_as_read(
        db: AsyncSession,
        notification_ids: list[int],
        user_id: int,
    ) -> int:
        """
        알림 읽음 처리

        Args:
            db: 데이터베이스 세션
            notification_ids: 알림 ID 목록
            user_id: 사용자 ID

        Returns:
            업데이트된 알림 수
        """
        result = await db.execute(
            update(Notification)
            .where(
                Notification.id.in_(notification_ids),
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
            .values(is_read=True, read_at=datetime.utcnow())
        )
        await db.commit()

        count = result.rowcount
        logger.info(f"알림 읽음 처리: user_id={user_id}, count={count}")
        return count

    @staticmethod
    async def mark_all_as_read(db: AsyncSession, user_id: int) -> int:
        """모든 알림 읽음 처리"""
        result = await db.execute(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
            .values(is_read=True, read_at=datetime.utcnow())
        )
        await db.commit()

        count = result.rowcount
        logger.info(f"전체 알림 읽음 처리: user_id={user_id}, count={count}")
        return count

    @staticmethod
    async def delete_notification(
        db: AsyncSession,
        notification_id: int,
        user_id: int,
    ) -> bool:
        """알림 삭제"""
        result = await db.execute(
            delete(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        await db.commit()

        deleted = result.rowcount > 0
        if deleted:
            logger.info(f"알림 삭제: id={notification_id}, user_id={user_id}")
        return deleted

    # ============================================================
    # Price Alert CRUD
    # ============================================================

    @staticmethod
    async def create_price_alert(
        db: AsyncSession,
        user_id: int,
        alert_data: PriceAlertCreate,
    ) -> PriceAlert:
        """
        가격 알림 생성

        Args:
            db: 데이터베이스 세션
            user_id: 사용자 ID
            alert_data: 알림 생성 데이터

        Returns:
            생성된 가격 알림 객체
        """
        # 사용자당 최대 50개 제한
        count_result = await db.execute(
            select(func.count(PriceAlert.id)).where(
                PriceAlert.user_id == user_id,
                PriceAlert.is_active == True,
            )
        )
        active_count = count_result.scalar() or 0

        if active_count >= 50:
            raise ValueError("활성 가격 알림은 최대 50개까지 설정할 수 있습니다")

        alert = PriceAlert(
            user_id=user_id,
            symbol=alert_data.symbol.upper(),
            condition=alert_data.condition,
            target_price=alert_data.target_price,
            is_recurring=alert_data.is_recurring,
            cooldown_mins=alert_data.cooldown_mins,
            note=alert_data.note,
        )

        db.add(alert)
        await db.commit()
        await db.refresh(alert)

        logger.info(f"가격 알림 생성: id={alert.id}, symbol={alert.symbol}, target={alert.target_price}")
        return alert

    @staticmethod
    async def get_price_alerts(
        db: AsyncSession,
        user_id: int,
        symbol: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> list[PriceAlert]:
        """사용자 가격 알림 목록 조회"""
        query = select(PriceAlert).where(PriceAlert.user_id == user_id)

        if symbol:
            query = query.where(PriceAlert.symbol == symbol.upper())

        if is_active is not None:
            query = query.where(PriceAlert.is_active == is_active)

        query = query.order_by(PriceAlert.created_at.desc())

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_price_alert_by_id(
        db: AsyncSession,
        alert_id: int,
        user_id: int,
    ) -> Optional[PriceAlert]:
        """가격 알림 조회"""
        result = await db.execute(
            select(PriceAlert).where(
                PriceAlert.id == alert_id,
                PriceAlert.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_price_alert(
        db: AsyncSession,
        alert: PriceAlert,
        update_data: PriceAlertUpdate,
    ) -> PriceAlert:
        """가격 알림 수정"""
        update_dict = update_data.model_dump(exclude_unset=True)

        for field, value in update_dict.items():
            if field == "symbol" and value:
                value = value.upper()
            setattr(alert, field, value)

        await db.commit()
        await db.refresh(alert)

        logger.info(f"가격 알림 수정: id={alert.id}")
        return alert

    @staticmethod
    async def delete_price_alert(
        db: AsyncSession,
        alert_id: int,
        user_id: int,
    ) -> bool:
        """가격 알림 삭제"""
        result = await db.execute(
            delete(PriceAlert).where(
                PriceAlert.id == alert_id,
                PriceAlert.user_id == user_id,
            )
        )
        await db.commit()

        deleted = result.rowcount > 0
        if deleted:
            logger.info(f"가격 알림 삭제: id={alert_id}")
        return deleted

    @staticmethod
    async def toggle_price_alert(
        db: AsyncSession,
        alert_id: int,
        user_id: int,
    ) -> Optional[PriceAlert]:
        """가격 알림 활성/비활성 토글"""
        alert = await NotificationService.get_price_alert_by_id(db, alert_id, user_id)
        if not alert:
            return None

        alert.is_active = not alert.is_active

        # 비활성화 시 트리거 상태 초기화
        if not alert.is_active:
            alert.is_triggered = False
            alert.triggered_at = None

        await db.commit()
        await db.refresh(alert)

        logger.info(f"가격 알림 토글: id={alert_id}, is_active={alert.is_active}")
        return alert

    # ============================================================
    # Notification Preferences
    # ============================================================

    @staticmethod
    async def get_or_create_preferences(
        db: AsyncSession,
        user_id: int,
    ) -> NotificationPreference:
        """알림 설정 조회 또는 생성"""
        result = await db.execute(
            select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        )
        pref = result.scalar_one_or_none()

        if pref is None:
            pref = NotificationPreference(user_id=user_id)
            db.add(pref)
            await db.commit()
            await db.refresh(pref)
            logger.info(f"알림 설정 생성: user_id={user_id}")

        return pref

    @staticmethod
    async def update_preferences(
        db: AsyncSession,
        user_id: int,
        update_data: NotificationPreferenceUpdate,
    ) -> NotificationPreference:
        """알림 설정 수정"""
        pref = await NotificationService.get_or_create_preferences(db, user_id)

        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(pref, field, value)

        await db.commit()
        await db.refresh(pref)

        logger.info(f"알림 설정 수정: user_id={user_id}")
        return pref

    # ============================================================
    # News Subscriptions
    # ============================================================

    @staticmethod
    async def get_news_subscriptions(
        db: AsyncSession,
        user_id: int,
    ) -> list[NewsSubscription]:
        """뉴스 구독 목록 조회"""
        result = await db.execute(
            select(NewsSubscription)
            .where(NewsSubscription.user_id == user_id)
            .order_by(NewsSubscription.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_news_subscription(
        db: AsyncSession,
        user_id: int,
        sub_data: NewsSubscriptionCreate,
    ) -> NewsSubscription:
        """뉴스 구독 생성"""
        # 중복 확인
        existing = await db.execute(
            select(NewsSubscription).where(
                NewsSubscription.user_id == user_id,
                NewsSubscription.source == sub_data.source,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"이미 '{sub_data.source}' 소스를 구독하고 있습니다")

        keywords_str = ",".join(sub_data.keywords) if sub_data.keywords else None

        sub = NewsSubscription(
            user_id=user_id,
            source=sub_data.source,
            keywords=keywords_str,
        )

        db.add(sub)
        await db.commit()
        await db.refresh(sub)

        logger.info(f"뉴스 구독 생성: user_id={user_id}, source={sub_data.source}")
        return sub

    @staticmethod
    async def update_news_subscription(
        db: AsyncSession,
        subscription_id: int,
        user_id: int,
        update_data: NewsSubscriptionUpdate,
    ) -> Optional[NewsSubscription]:
        """뉴스 구독 수정"""
        result = await db.execute(
            select(NewsSubscription).where(
                NewsSubscription.id == subscription_id,
                NewsSubscription.user_id == user_id,
            )
        )
        sub = result.scalar_one_or_none()

        if not sub:
            return None

        update_dict = update_data.model_dump(exclude_unset=True)

        if "keywords" in update_dict:
            keywords = update_dict.pop("keywords")
            sub.keywords = ",".join(keywords) if keywords else None

        for field, value in update_dict.items():
            setattr(sub, field, value)

        await db.commit()
        await db.refresh(sub)

        logger.info(f"뉴스 구독 수정: id={subscription_id}")
        return sub

    @staticmethod
    async def delete_news_subscription(
        db: AsyncSession,
        source: str,
        user_id: int,
    ) -> bool:
        """뉴스 구독 삭제"""
        result = await db.execute(
            delete(NewsSubscription).where(
                NewsSubscription.source == source,
                NewsSubscription.user_id == user_id,
            )
        )
        await db.commit()

        deleted = result.rowcount > 0
        if deleted:
            logger.info(f"뉴스 구독 삭제: source={source}, user_id={user_id}")
        return deleted
