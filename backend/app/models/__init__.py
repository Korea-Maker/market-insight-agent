"""
SQLAlchemy 모델들
"""
from app.models.news import News
from app.models.user import User, OAuthAccount
from app.models.post import Post, PostLike, Tag, post_tags
from app.models.comment import Comment, CommentLike
from app.models.source import IntelligenceSource
from app.models.market_insight import MarketInsight
from app.models.news_sentiment import NewsSentiment
from app.models.sentiment_snapshot import SentimentSnapshot
from app.models.notification import (
    Notification,
    PriceAlert,
    NotificationType,
    NotificationPriority,
    AlertCondition,
)
from app.models.notification_pref import (
    NotificationPreference,
    NewsSubscription,
)

__all__ = [
    "News",
    "User",
    "OAuthAccount",
    "Post",
    "PostLike",
    "Tag",
    "post_tags",
    "Comment",
    "CommentLike",
    "IntelligenceSource",
    "MarketInsight",
    "NewsSentiment",
    "SentimentSnapshot",
    # Notification system
    "Notification",
    "PriceAlert",
    "NotificationType",
    "NotificationPriority",
    "AlertCondition",
    "NotificationPreference",
    "NewsSubscription",
]
