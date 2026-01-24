"""
알림 발송 관리 서비스
WebSocket, Redis Pub/Sub을 통한 실시간 알림 발송
"""
import json
import logging
from datetime import datetime
from typing import Optional, Any

from app.core.redis import get_redis_client, REDIS_ENABLED
from app.models.notification import Notification

logger = logging.getLogger(__name__)


class NotificationDispatcher:
    """
    알림 발송 관리자

    다양한 채널을 통해 알림을 발송합니다:
    - Redis Pub/Sub (실시간 WebSocket 전달용)
    - 이메일 (Future)
    - 푸시 알림 (Future)
    """

    @staticmethod
    async def dispatch(
        notification: Notification,
        channels: list[str] = None,
    ) -> dict[str, bool]:
        """
        알림 발송

        Args:
            notification: 알림 객체
            channels: 발송 채널 목록 (기본: websocket)

        Returns:
            채널별 발송 결과
        """
        if channels is None:
            channels = ["websocket"]

        results = {}

        for channel in channels:
            try:
                if channel == "websocket":
                    success = await NotificationDispatcher.send_websocket(notification)
                    results["websocket"] = success
                elif channel == "email":
                    # Future: 이메일 발송
                    results["email"] = False
                elif channel == "push":
                    # Future: 푸시 알림
                    results["push"] = False
                else:
                    logger.warning(f"알 수 없는 알림 채널: {channel}")
                    results[channel] = False

            except Exception as e:
                logger.error(f"알림 발송 오류 ({channel}): {e}")
                results[channel] = False

        return results

    @staticmethod
    async def send_websocket(notification: Notification) -> bool:
        """
        WebSocket을 통해 알림 발송 (Redis Pub/Sub 사용)

        Args:
            notification: 알림 객체

        Returns:
            발송 성공 여부
        """
        if not REDIS_ENABLED:
            logger.debug("Redis가 비활성화되어 WebSocket 알림을 발송하지 않습니다")
            return False

        redis = await get_redis_client()
        if not redis:
            return False

        try:
            channel = f"notifications:{notification.user_id}"

            # 알림 데이터 파싱
            data = {}
            if notification.data:
                try:
                    data = json.loads(notification.data)
                except json.JSONDecodeError:
                    data = {}

            message = {
                "type": notification.type,
                "id": f"notif_{notification.id}",
                "timestamp": notification.created_at.isoformat() if notification.created_at else datetime.utcnow().isoformat(),
                "priority": notification.priority,
                "data": data,
                "title": notification.title,
                "message": notification.message,
            }

            await redis.publish(channel, json.dumps(message))
            logger.debug(f"WebSocket 알림 발송: channel={channel}, notif_id={notification.id}")
            return True

        except Exception as e:
            logger.error(f"WebSocket 알림 발송 오류: {e}")
            return False

    @staticmethod
    async def broadcast(
        notification_type: str,
        title: str,
        message: str,
        data: Optional[dict[str, Any]] = None,
        priority: str = "medium",
    ) -> bool:
        """
        전체 사용자에게 브로드캐스트 알림 발송

        Args:
            notification_type: 알림 유형
            title: 제목
            message: 내용
            data: 추가 데이터
            priority: 우선순위

        Returns:
            발송 성공 여부
        """
        if not REDIS_ENABLED:
            return False

        redis = await get_redis_client()
        if not redis:
            return False

        try:
            broadcast_message = {
                "type": notification_type,
                "id": f"broadcast_{datetime.utcnow().timestamp()}",
                "timestamp": datetime.utcnow().isoformat(),
                "priority": priority,
                "data": data or {},
                "title": title,
                "message": message,
            }

            await redis.publish("notifications:broadcast", json.dumps(broadcast_message))
            logger.info(f"브로드캐스트 알림 발송: type={notification_type}")
            return True

        except Exception as e:
            logger.error(f"브로드캐스트 알림 발송 오류: {e}")
            return False

    @staticmethod
    async def send_news_notification(
        user_id: int,
        news_id: int,
        title: str,
        source: str,
        url: str,
        matched_keywords: list[str] = None,
    ) -> bool:
        """
        뉴스 알림 발송

        Args:
            user_id: 사용자 ID
            news_id: 뉴스 ID
            title: 뉴스 제목
            source: 뉴스 소스
            url: 뉴스 URL
            matched_keywords: 매칭된 키워드 목록

        Returns:
            발송 성공 여부
        """
        if not REDIS_ENABLED:
            return False

        redis = await get_redis_client()
        if not redis:
            return False

        try:
            channel = f"notifications:{user_id}"

            message = {
                "type": "news",
                "id": f"news_{news_id}_{datetime.utcnow().timestamp()}",
                "timestamp": datetime.utcnow().isoformat(),
                "priority": "medium",
                "data": {
                    "news_id": news_id,
                    "source": source,
                    "url": url,
                    "matched_keywords": matched_keywords or [],
                },
                "title": f"[{source}] 새로운 뉴스",
                "message": title,
            }

            await redis.publish(channel, json.dumps(message))
            logger.debug(f"뉴스 알림 발송: user_id={user_id}, news_id={news_id}")
            return True

        except Exception as e:
            logger.error(f"뉴스 알림 발송 오류: {e}")
            return False

    @staticmethod
    async def send_system_notification(
        user_id: int,
        title: str,
        message: str,
        code: str = None,
        action_url: str = None,
        priority: str = "medium",
    ) -> bool:
        """
        시스템 알림 발송

        Args:
            user_id: 사용자 ID
            title: 제목
            message: 내용
            code: 알림 코드
            action_url: 액션 URL
            priority: 우선순위

        Returns:
            발송 성공 여부
        """
        if not REDIS_ENABLED:
            return False

        redis = await get_redis_client()
        if not redis:
            return False

        try:
            channel = f"notifications:{user_id}"

            notification_message = {
                "type": "system",
                "id": f"system_{datetime.utcnow().timestamp()}",
                "timestamp": datetime.utcnow().isoformat(),
                "priority": priority,
                "data": {
                    "code": code,
                    "action_url": action_url,
                },
                "title": title,
                "message": message,
            }

            await redis.publish(channel, json.dumps(notification_message))
            logger.debug(f"시스템 알림 발송: user_id={user_id}, code={code}")
            return True

        except Exception as e:
            logger.error(f"시스템 알림 발송 오류: {e}")
            return False


# 편의를 위한 싱글톤 인스턴스
dispatcher = NotificationDispatcher()
