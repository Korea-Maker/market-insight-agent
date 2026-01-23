"""
가격 알림 체커 서비스
실시간 가격 데이터를 모니터링하고 알림 조건 충족 시 알림 발송
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.notification import Notification, PriceAlert, NotificationType, NotificationPriority
from app.models.notification_pref import NotificationPreference
from app.core.redis import get_redis_client, get_redis_pubsub, REDIS_ENABLED

logger = logging.getLogger(__name__)


class AlertChecker:
    """
    가격 알림 체커

    Redis에서 실시간 가격을 구독하고 알림 조건을 평가합니다.
    """

    def __init__(self):
        self._running = False
        self._last_prices: dict[str, Decimal] = {}  # symbol -> last_price
        self._task: Optional[asyncio.Task] = None

    async def start(self, get_db_session):
        """
        알림 체커 시작

        Args:
            get_db_session: DB 세션 팩토리 함수
        """
        if not REDIS_ENABLED:
            logger.warning("Redis가 비활성화되어 가격 알림 체커를 시작하지 않습니다")
            return

        if self._running:
            logger.warning("알림 체커가 이미 실행 중입니다")
            return

        self._running = True
        self._task = asyncio.create_task(self._run(get_db_session))
        logger.info("가격 알림 체커 시작")

    async def stop(self):
        """알림 체커 중지"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("가격 알림 체커 중지")

    async def _run(self, get_db_session):
        """메인 루프"""
        pubsub = await get_redis_pubsub()
        if not pubsub:
            logger.error("Redis Pub/Sub 클라이언트를 가져올 수 없습니다")
            return

        try:
            # live_prices 채널 구독
            await pubsub.subscribe("live_prices")
            logger.info("live_prices 채널 구독 시작")

            while self._running:
                try:
                    message = await pubsub.get_message(
                        ignore_subscribe_messages=True,
                        timeout=1.0,
                    )

                    if message and message["type"] == "message":
                        await self._process_price_message(message["data"], get_db_session)

                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"가격 메시지 처리 중 오류: {e}")
                    await asyncio.sleep(1)

        finally:
            await pubsub.unsubscribe("live_prices")
            logger.info("live_prices 채널 구독 해제")

    async def _process_price_message(self, data: str, get_db_session):
        """
        가격 메시지 처리

        Args:
            data: JSON 형식의 가격 데이터
            get_db_session: DB 세션 팩토리 함수
        """
        try:
            price_data = json.loads(data)
            symbol = price_data.get("symbol", "").upper()
            current_price = Decimal(str(price_data.get("price", 0)))

            if not symbol or current_price <= 0:
                return

            # 이전 가격 저장 (cross 조건 평가용)
            last_price = self._last_prices.get(symbol)
            self._last_prices[symbol] = current_price

            # DB 세션 생성 및 알림 체크
            async with get_db_session() as db:
                await self._check_alerts(db, symbol, current_price, last_price)

        except json.JSONDecodeError:
            logger.warning(f"잘못된 가격 데이터 형식: {data[:100]}")
        except Exception as e:
            logger.error(f"가격 메시지 처리 오류: {e}")

    async def _check_alerts(
        self,
        db: AsyncSession,
        symbol: str,
        current_price: Decimal,
        last_price: Optional[Decimal],
    ):
        """
        알림 조건 체크

        Args:
            db: DB 세션
            symbol: 심볼
            current_price: 현재 가격
            last_price: 이전 가격
        """
        # 활성 알림 조회
        result = await db.execute(
            select(PriceAlert).where(
                PriceAlert.symbol == symbol,
                PriceAlert.is_active == True,
            )
        )
        alerts = result.scalars().all()

        for alert in alerts:
            try:
                should_trigger = self._evaluate_condition(
                    alert.condition,
                    alert.target_price,
                    current_price,
                    last_price,
                )

                if should_trigger:
                    await self._trigger_alert(db, alert, current_price)

            except Exception as e:
                logger.error(f"알림 평가 오류 (alert_id={alert.id}): {e}")

    def _evaluate_condition(
        self,
        condition: str,
        target_price: Decimal,
        current_price: Decimal,
        last_price: Optional[Decimal],
    ) -> bool:
        """
        알림 조건 평가

        Args:
            condition: 조건 (above, below, cross)
            target_price: 목표 가격
            current_price: 현재 가격
            last_price: 이전 가격

        Returns:
            조건 충족 여부
        """
        if condition == "above":
            return current_price >= target_price

        elif condition == "below":
            return current_price <= target_price

        elif condition == "cross":
            # 교차 조건: 이전 가격과 현재 가격이 목표가를 교차
            if last_price is None:
                return False

            crossed_up = last_price < target_price <= current_price
            crossed_down = last_price > target_price >= current_price
            return crossed_up or crossed_down

        return False

    async def _trigger_alert(
        self,
        db: AsyncSession,
        alert: PriceAlert,
        current_price: Decimal,
    ):
        """
        알림 트리거

        Args:
            db: DB 세션
            alert: 가격 알림 객체
            current_price: 현재 가격
        """
        now = datetime.utcnow()

        # 쿨다운 체크 (반복 알림의 경우)
        if alert.is_recurring and alert.last_notified:
            cooldown_end = alert.last_notified + timedelta(minutes=alert.cooldown_mins)
            if now < cooldown_end:
                return

        # 비반복 알림이고 이미 트리거된 경우 스킵
        if not alert.is_recurring and alert.is_triggered:
            return

        # 사용자 알림 설정 확인
        pref_result = await db.execute(
            select(NotificationPreference).where(NotificationPreference.user_id == alert.user_id)
        )
        pref = pref_result.scalar_one_or_none()

        # 가격 알림이 비활성화된 경우 스킵
        if pref and not pref.price_alerts:
            return

        # 방해금지 시간 체크
        if pref and pref.is_quiet_time(now.time()):
            logger.debug(f"방해금지 시간으로 알림 스킵: user_id={alert.user_id}")
            return

        # 알림 생성
        condition_text = {
            "above": "이상",
            "below": "이하",
            "cross": "교차",
        }.get(alert.condition, alert.condition)

        notification = Notification(
            user_id=alert.user_id,
            type=NotificationType.PRICE_ALERT.value,
            title=f"{alert.symbol} 가격 알림",
            message=f"{alert.symbol}이(가) ${float(current_price):,.2f}에 도달했습니다. (목표: ${float(alert.target_price):,.2f} {condition_text})",
            data=json.dumps({
                "symbol": alert.symbol,
                "condition": alert.condition,
                "target_price": str(alert.target_price),
                "current_price": str(current_price),
                "alert_id": alert.id,
            }),
            priority=NotificationPriority.HIGH.value,
        )
        db.add(notification)

        # 알림 상태 업데이트
        alert.is_triggered = True
        alert.triggered_at = now
        alert.last_notified = now

        # 비반복 알림은 비활성화
        if not alert.is_recurring:
            alert.is_active = False

        await db.commit()

        logger.info(
            f"가격 알림 트리거: alert_id={alert.id}, symbol={alert.symbol}, "
            f"target={alert.target_price}, current={current_price}"
        )

        # Redis로 실시간 알림 발송
        await self._publish_notification(notification)

    async def _publish_notification(self, notification: Notification):
        """Redis로 알림 발송"""
        redis = await get_redis_client()
        if not redis:
            return

        try:
            channel = f"notifications:{notification.user_id}"
            message = json.dumps({
                "type": notification.type,
                "id": f"notif_{notification.id}",
                "timestamp": notification.created_at.isoformat(),
                "priority": notification.priority,
                "data": json.loads(notification.data) if notification.data else {},
                "title": notification.title,
                "message": notification.message,
            })
            await redis.publish(channel, message)
            logger.debug(f"알림 발송: channel={channel}")

        except Exception as e:
            logger.error(f"알림 발송 오류: {e}")


# 싱글톤 인스턴스
alert_checker = AlertChecker()
