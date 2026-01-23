"""
시장 분석 엔진 서비스
OpenAI GPT API를 사용하여 시장 분석을 생성합니다.
"""
import time
import asyncio
import logging
from typing import List, Optional

from openai import AsyncOpenAI

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.market_insight import MarketInsight, TradingRecommendation, RiskLevel
from app.services.market_data_aggregator import MarketDataAggregator
from app.services.news_analyzer import NewsAnalyzer, NewsInsight
from app.services.prompts import SYSTEM_PROMPT, build_analysis_prompt
from app.services.response_parser import parse_gpt_response

logger = logging.getLogger(__name__)


class MarketInsightEngine:
    """
    시장 분석 엔진
    OpenAI GPT API를 사용하여 시장 데이터와 뉴스를 분석하고 인사이트를 생성합니다.
    """

    def __init__(self):
        """MarketInsightEngine 초기화"""
        api_key = getattr(settings, 'OPENAI_API_KEY', None)
        if not api_key:
            logger.warning("OPENAI_API_KEY가 설정되지 않았습니다. 분석 기능이 비활성화됩니다.")
            self.client = None
        else:
            self.client = AsyncOpenAI(api_key=api_key)

        # GPT-5.2 모델 사용
        self.model = "gpt-5.2"
        self.market_aggregator = MarketDataAggregator()
        self.news_analyzer = NewsAnalyzer()

    async def _collect_market_data(self, symbol: str):
        """시장 데이터 수집"""
        async with self.market_aggregator:
            return await self.market_aggregator.get_market_snapshot(symbol)

    async def _analyze_news(self, symbol: str) -> List[NewsInsight]:
        """뉴스 분석"""
        async with AsyncSessionLocal() as db:
            try:
                return await self.news_analyzer.analyze_recent_news(
                    db=db,
                    hours=24,
                    symbol=symbol.replace("USDT", ""),
                    limit=20
                )
            except Exception as e:
                logger.warning(f"뉴스 분석 실패 (계속 진행): {e}")
                return []

    async def _call_openai_api(self, prompt: str) -> str:
        """OpenAI GPT API 호출"""
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_completion_tokens=1500,
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content

    async def _save_insight(self, insight: MarketInsight) -> MarketInsight:
        """분석 결과 저장"""
        async with AsyncSessionLocal() as db:
            db.add(insight)
            await db.commit()
            await db.refresh(insight)
            logger.info(f"시장 분석 저장 완료: ID={insight.id}")
            return insight

    async def generate_insight(self, symbol: str = "BTCUSDT") -> Optional[MarketInsight]:
        """
        시장 분석 생성

        Args:
            symbol: 분석할 심볼 (기본값: BTCUSDT)

        Returns:
            MarketInsight 객체 또는 None (API 키 미설정 시)
        """
        if not self.client:
            logger.warning("OpenAI API 클라이언트가 초기화되지 않았습니다.")
            return None

        start_time = time.time()

        try:
            logger.info(f"시장 분석 시작: {symbol}")

            # 1. 시장 데이터 수집
            market_snapshot = await self._collect_market_data(symbol)
            logger.info(f"시장 데이터 수집 완료: 가격=${market_snapshot.current_price:,.2f}")

            # 2. 뉴스 분석
            news_insights = await self._analyze_news(symbol)
            logger.info(f"뉴스 분석 완료: {len(news_insights)}개")

            # 3. OpenAI GPT API 호출
            prompt = build_analysis_prompt(market_snapshot, news_insights)
            response_text = await self._call_openai_api(prompt)
            logger.info("OpenAI GPT API 응답 수신 완료")

            # 4. 응답 파싱
            parsed_response = parse_gpt_response(response_text)

            # 5. 처리 시간 계산
            processing_time_ms = int((time.time() - start_time) * 1000)

            # 6. MarketInsight 객체 생성
            insight = MarketInsight(
                symbol=symbol,
                current_price=market_snapshot.current_price,
                price_change_24h=market_snapshot.price_change_24h,
                volume_24h=market_snapshot.volume_24h,
                rsi_14=market_snapshot.rsi_14,
                volatility_24h=market_snapshot.volatility_24h,
                analysis_summary=parsed_response["summary"],
                price_change_reason=parsed_response["price_reason"],
                recommendation=TradingRecommendation(parsed_response["recommendation"]),
                recommendation_reason=parsed_response["recommendation_reason"],
                risk_level=RiskLevel(parsed_response["risk_level"]),
                market_sentiment_score=parsed_response["sentiment_score"],
                market_sentiment_label=parsed_response["sentiment_label"],
                ai_model=self.model,
                processing_time_ms=processing_time_ms
            )

            # 7. 데이터베이스 저장
            insight = await self._save_insight(insight)

            logger.info(
                f"시장 분석 완료: {symbol}, "
                f"추천={insight.recommendation.value}, "
                f"처리시간={processing_time_ms}ms"
            )

            return insight

        except Exception as e:
            logger.error(f"시장 분석 오류: {e}", exc_info=True)
            raise


async def run_market_insight_analyzer(interval_minutes: int = 5):
    """
    주기적으로 시장 분석 실행

    Args:
        interval_minutes: 분석 간격 (분)
    """
    engine = MarketInsightEngine()

    if not engine.client:
        logger.warning("OPENAI_API_KEY가 설정되지 않아 시장 분석 백그라운드 태스크를 시작하지 않습니다.")
        return

    logger.info(f"시장 분석 백그라운드 태스크 시작 (간격: {interval_minutes}분)")

    while True:
        try:
            insight = await engine.generate_insight("BTCUSDT")
            if insight:
                logger.info(f"시장 분석 완료: {insight.recommendation.value}")
            await asyncio.sleep(interval_minutes * 60)
        except asyncio.CancelledError:
            logger.info("시장 분석 백그라운드 태스크 종료")
            break
        except Exception as e:
            logger.error(f"시장 분석 오류: {e}")
            # 오류 발생 시 1분 후 재시도
            await asyncio.sleep(60)
