"""
뉴스 분석 서비스
뉴스 데이터의 감성 분석, 키워드 추출, 중요도 평가
"""
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.news import News

logger = logging.getLogger(__name__)


@dataclass
class NewsInsight:
    """뉴스 분석 결과 데이터클래스"""
    news_id: int
    title: str
    title_kr: Optional[str]
    source: str
    published: Optional[datetime]

    # 감성 분석
    sentiment: str  # positive, negative, neutral
    sentiment_score: float  # -1.0 ~ 1.0

    # 중요도
    importance: float  # 0.0 ~ 1.0

    # 키워드
    keywords: List[str]

    # 시장 영향도
    market_impact: str  # high, medium, low


class NewsAnalyzer:
    """
    뉴스 분석기
    감성 분석, 키워드 추출, 중요도 평가를 수행
    """

    def __init__(self):
        # 암호화폐 관련 키워드
        self.crypto_keywords = [
            'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
            'blockchain', 'regulation', 'sec', 'etf', 'mining', 'halving',
            'adoption', 'institutional', 'whale', 'bullish', 'bearish',
            'defi', 'nft', 'altcoin', 'bull', 'bear', 'rally', 'crash'
        ]

        # 신뢰도 높은 소스
        self.trusted_sources = ['CoinDesk', 'The Block', 'CoinTelegraph', 'Decrypt']

        # 심볼별 키워드 매핑
        self.symbol_keywords = {
            'BTC': ['bitcoin', 'btc'],
            'ETH': ['ethereum', 'eth'],
            'BNB': ['binance', 'bnb'],
            'SOL': ['solana', 'sol'],
            'XRP': ['ripple', 'xrp']
        }

        # 긍정 키워드
        self.positive_words = [
            'bullish', 'surge', 'rally', 'gain', 'rise', 'soar', 'boost',
            'adoption', 'approval', 'breakthrough', 'partnership', 'upgrade'
        ]

        # 부정 키워드
        self.negative_words = [
            'bearish', 'crash', 'drop', 'fall', 'decline', 'plunge', 'loss',
            'ban', 'hack', 'fraud', 'lawsuit', 'investigation', 'warning'
        ]

    async def analyze_recent_news(
        self,
        symbol: str = "BTC",
        hours: int = 24,
        limit: int = 20
    ) -> List[NewsInsight]:
        """
        최근 뉴스 분석

        Args:
            symbol: 분석할 심볼 (BTC, ETH 등)
            hours: 조회할 시간 범위
            limit: 최대 조회 개수

        Returns:
            NewsInsight 리스트
        """
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)

        async with AsyncSessionLocal() as session:
            stmt = (
                select(News)
                .where(News.created_at >= cutoff_time)
                .order_by(News.created_at.desc())
                .limit(limit)
            )
            result = await session.execute(stmt)
            news_list = result.scalars().all()

        insights = []
        for news in news_list:
            # 심볼 관련성 확인
            text = f"{news.title} {news.description or ''}".lower()
            if not self._is_relevant_to_symbol(text, symbol):
                continue

            # 키워드 추출
            keywords = self._extract_keywords(text)

            # 감성 분석
            sentiment, sentiment_score = self._analyze_sentiment(text)

            # 중요도 계산
            importance = self._calculate_importance(news, keywords)

            # 시장 영향도 평가
            market_impact = self._evaluate_market_impact(sentiment_score, importance)

            insight = NewsInsight(
                news_id=news.id,
                title=news.title,
                title_kr=news.title_kr,
                source=news.source,
                published=news.published,
                sentiment=sentiment,
                sentiment_score=sentiment_score,
                importance=importance,
                keywords=keywords,
                market_impact=market_impact
            )
            insights.append(insight)

        logger.info(f"Analyzed {len(insights)} news articles for {symbol}")
        return insights

    def _is_relevant_to_symbol(self, text: str, symbol: str) -> bool:
        """
        심볼 관련성 확인

        Args:
            text: 분석할 텍스트
            symbol: 심볼 (BTC, ETH 등)

        Returns:
            관련성 여부
        """
        symbol = symbol.upper()

        # 심볼별 키워드 매핑에서 확인
        if symbol in self.symbol_keywords:
            keywords = self.symbol_keywords[symbol]
            for keyword in keywords:
                if keyword in text:
                    return True

        # 일반 암호화폐 키워드로도 관련성 있음 (crypto, blockchain 등)
        general_keywords = ['crypto', 'cryptocurrency', 'blockchain', 'market']
        for keyword in general_keywords:
            if keyword in text:
                return True

        return False

    def _analyze_sentiment(self, text: str) -> Tuple[str, float]:
        """
        간단한 감성 분석 (키워드 기반)

        Args:
            text: 분석할 텍스트

        Returns:
            (sentiment, score) 튜플
            sentiment: positive, negative, neutral
            score: -1.0 ~ 1.0
        """
        text_lower = text.lower()

        # 단어 경계를 고려한 키워드 매칭
        positive_count = 0
        negative_count = 0

        for word in self.positive_words:
            # 단어 경계 매칭 (word boundary)
            pattern = r'\b' + re.escape(word) + r'\b'
            matches = re.findall(pattern, text_lower)
            positive_count += len(matches)

        for word in self.negative_words:
            pattern = r'\b' + re.escape(word) + r'\b'
            matches = re.findall(pattern, text_lower)
            negative_count += len(matches)

        # 감성 점수 계산
        total_count = positive_count + negative_count
        if total_count == 0:
            return 'neutral', 0.0

        # 점수 계산: (positive - negative) / total
        raw_score = (positive_count - negative_count) / total_count

        # -1.0 ~ 1.0 범위로 정규화
        score = max(-1.0, min(1.0, raw_score))

        # 감성 분류 (약한 감성은 neutral)
        if score > 0.2:
            sentiment = 'positive'
        elif score < -0.2:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'

        return sentiment, round(score, 3)

    def _extract_keywords(self, text: str) -> List[str]:
        """
        키워드 추출

        Args:
            text: 분석할 텍스트

        Returns:
            추출된 키워드 리스트
        """
        text_lower = text.lower()
        found_keywords = []

        for keyword in self.crypto_keywords:
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, text_lower):
                found_keywords.append(keyword)

        return found_keywords

    def _calculate_importance(self, news: News, keywords: List[str]) -> float:
        """
        중요도 계산 (0.0 ~ 1.0)

        Args:
            news: 뉴스 객체
            keywords: 추출된 키워드 리스트

        Returns:
            중요도 점수
        """
        importance = 0.0

        # 1. 키워드 개수 기반 (최대 0.5)
        keyword_score = min(len(keywords) * 0.1, 0.5)
        importance += keyword_score

        # 2. 신뢰 소스 여부 (+0.3)
        if news.source in self.trusted_sources:
            importance += 0.3

        # 3. 최신성 기반
        if news.created_at:
            now = datetime.now(timezone.utc)
            hours_ago = (now - news.created_at).total_seconds() / 3600

            if hours_ago < 1:
                importance += 0.2  # 1시간 이내
            elif hours_ago < 6:
                importance += 0.1  # 6시간 이내

        # 최대 1.0으로 제한
        return min(round(importance, 3), 1.0)

    def _evaluate_market_impact(self, sentiment_score: float, importance: float) -> str:
        """
        시장 영향도 평가

        Args:
            sentiment_score: 감성 점수 (-1.0 ~ 1.0)
            importance: 중요도 (0.0 ~ 1.0)

        Returns:
            시장 영향도 (high, medium, low)
        """
        # 절대값으로 감성 강도 계산
        sentiment_strength = abs(sentiment_score)

        # 복합 점수 계산
        impact_score = (sentiment_strength * 0.4) + (importance * 0.6)

        if impact_score >= 0.6:
            return 'high'
        elif impact_score >= 0.3:
            return 'medium'
        else:
            return 'low'
