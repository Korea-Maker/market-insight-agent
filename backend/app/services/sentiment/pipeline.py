"""
감성 분석 파이프라인 오케스트레이터

뉴스 수집 → 전처리 → 분석 → 집계 → 저장
전체 워크플로우 조정
"""
import json
import logging
import time
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.news import News
from app.models.news_sentiment import NewsSentiment
from app.services.sentiment.analyzer import SentimentAnalyzer, SentimentResult
from app.services.sentiment.preprocessor import TextPreprocessor, PreprocessedText
from app.services.sentiment.aggregator import (
    SentimentAggregator,
    NewsSentimentInsight,
    AggregatedSentiment,
)

logger = logging.getLogger(__name__)


class SentimentPipeline:
    """
    감성 분석 파이프라인

    전체 흐름:
    1. 뉴스 전처리 (TextPreprocessor)
    2. 감성 분석 (SentimentAnalyzer)
    3. 결과 저장 (NewsSentiment)
    4. 집계 (SentimentAggregator)
    """

    def __init__(
        self,
        db: AsyncSession,
        analyzer: Optional[SentimentAnalyzer] = None,
        preprocessor: Optional[TextPreprocessor] = None,
        batch_size: int = 16,
    ):
        """
        Args:
            db: SQLAlchemy 비동기 세션
            analyzer: 감성 분석기 (기본: 새로 생성)
            preprocessor: 전처리기 (기본: 새로 생성)
            batch_size: 배치 크기
        """
        self.db = db
        self.analyzer = analyzer or SentimentAnalyzer()
        self.preprocessor = preprocessor or TextPreprocessor()
        self.aggregator = SentimentAggregator(db)
        self.batch_size = batch_size

    async def initialize(self) -> bool:
        """파이프라인 초기화 (모델 로딩)"""
        return await self.analyzer.initialize()

    async def process_news(self, news: News) -> Optional[NewsSentiment]:
        """
        단일 뉴스 처리

        Args:
            news: News 모델 인스턴스

        Returns:
            NewsSentiment 모델 인스턴스 (실패 시 None)
        """
        try:
            start_time = time.time()

            # 1. 전처리
            preprocessed = self.preprocessor.process_news_item(news)

            # 2. 감성 분석
            result = await self.analyzer.analyze(preprocessed.cleaned_text)

            # 3. 결과 저장
            sentiment = NewsSentiment(
                news_id=news.id,
                sentiment_score=result.score,
                sentiment_label=result.label.value,
                confidence=result.confidence,
                positive_prob=result.positive_prob,
                negative_prob=result.negative_prob,
                neutral_prob=result.neutral_prob,
                related_symbols=",".join(preprocessed.detected_symbols),
                relevance_score=preprocessed.relevance_score,
                key_phrases=json.dumps(result.key_phrases) if result.key_phrases else None,
                model_name=self.analyzer.MODEL_NAME,
                analyzed_at=datetime.now(timezone.utc),
                processing_time_ms=int((time.time() - start_time) * 1000),
            )

            self.db.add(sentiment)
            await self.db.commit()
            await self.db.refresh(sentiment)

            logger.debug(
                f"뉴스 분석 완료: id={news.id}, score={result.score:.2f}, "
                f"label={result.label.value}"
            )

            return sentiment

        except Exception as e:
            logger.error(f"뉴스 분석 실패 (id={news.id}): {e}")
            await self.db.rollback()
            return None

    async def process_news_batch(
        self,
        news_items: List[News],
    ) -> List[NewsSentiment]:
        """
        뉴스 배치 처리

        Args:
            news_items: News 모델 인스턴스 목록

        Returns:
            NewsSentiment 모델 인스턴스 목록
        """
        if not news_items:
            return []

        try:
            start_time = time.time()

            # 1. 전처리
            preprocessed_list: List[PreprocessedText] = [
                self.preprocessor.process_news_item(news) for news in news_items
            ]

            # 2. 배치 감성 분석
            texts = [p.cleaned_text for p in preprocessed_list]
            results: List[SentimentResult] = await self.analyzer.analyze_batch(
                texts, batch_size=self.batch_size
            )

            # 3. 결과 저장
            sentiments = []
            for news, preprocessed, result in zip(
                news_items, preprocessed_list, results
            ):
                sentiment = NewsSentiment(
                    news_id=news.id,
                    sentiment_score=result.score,
                    sentiment_label=result.label.value,
                    confidence=result.confidence,
                    positive_prob=result.positive_prob,
                    negative_prob=result.negative_prob,
                    neutral_prob=result.neutral_prob,
                    related_symbols=",".join(preprocessed.detected_symbols),
                    relevance_score=preprocessed.relevance_score,
                    key_phrases=(
                        json.dumps(result.key_phrases) if result.key_phrases else None
                    ),
                    model_name=self.analyzer.MODEL_NAME,
                    analyzed_at=datetime.now(timezone.utc),
                    processing_time_ms=result.processing_time_ms,
                )
                self.db.add(sentiment)
                sentiments.append(sentiment)

            await self.db.commit()

            # refresh all
            for sentiment in sentiments:
                await self.db.refresh(sentiment)

            elapsed = time.time() - start_time
            logger.info(
                f"배치 분석 완료: {len(sentiments)}개, "
                f"총 {elapsed:.2f}초 ({elapsed/len(sentiments)*1000:.0f}ms/개)"
            )

            return sentiments

        except Exception as e:
            logger.error(f"배치 분석 실패: {e}")
            await self.db.rollback()
            return []

    async def get_aggregated_sentiment(
        self,
        symbol: str = "BTC",
        timeframe: str = "24h",
    ) -> AggregatedSentiment:
        """
        집계된 시장 감성 조회

        Args:
            symbol: 심볼 (BTC, ETH, ALL ...)
            timeframe: 시간 범위 (1h, 4h, 24h)

        Returns:
            AggregatedSentiment 객체
        """
        return await self.aggregator.aggregate(symbol, timeframe)

    async def save_snapshot(
        self,
        symbol: str,
        timeframe: str,
    ) -> None:
        """
        현재 집계 결과를 스냅샷으로 저장

        Args:
            symbol: 심볼
            timeframe: 시간 범위
        """
        aggregated = await self.get_aggregated_sentiment(symbol, timeframe)
        if aggregated.total_news_count > 0:
            await self.aggregator.save_snapshot(aggregated)

    def to_insight(
        self,
        news: News,
        sentiment: NewsSentiment,
    ) -> NewsSentimentInsight:
        """
        News + NewsSentiment → NewsSentimentInsight 변환

        Args:
            news: News 모델
            sentiment: NewsSentiment 모델

        Returns:
            NewsSentimentInsight 데이터클래스
        """
        from app.services.sentiment.analyzer import SentimentLabel

        return NewsSentimentInsight(
            news_id=news.id,
            title=news.title,
            source=news.source,
            published=news.published,
            sentiment_score=sentiment.sentiment_score,
            sentiment_label=SentimentLabel(sentiment.sentiment_label),
            confidence=sentiment.confidence,
            related_symbols=(
                sentiment.related_symbols.split(",")
                if sentiment.related_symbols
                else []
            ),
            relevance_score=sentiment.relevance_score or 0.5,
        )
