"""
시장 분석 오케스트레이터 (재설계)

다중 LLM 제공자 지원, 자동 폴백, 서킷 브레이커를 포함한
AI 기반 시장 분석 파이프라인
"""

import time
import asyncio
import logging
from typing import Optional, List
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.market_insight import MarketInsight, TradingRecommendation, RiskLevel
from app.models.news import News
from app.services.market_data_aggregator import MarketDataAggregator
from app.services.news_analyzer import NewsAnalyzer, NewsInsight
from app.services.llm.provider_manager import get_provider_manager, LLMProviderManager
from app.services.llm.base_provider import LLMRequest, LLMProviderType
from app.services.llm.prompt_engine import PromptEngine, PromptVersion
from app.services.response_parser import parse_gpt_response


logger = logging.getLogger(__name__)


@dataclass
class AnalysisConfig:
    """분석 설정"""
    symbol: str = "BTCUSDT"
    provider: Optional[LLMProviderType] = None  # None = 자동 선택
    model: Optional[str] = None  # None = 제공자 기본값
    prompt_version: PromptVersion = PromptVersion.V1_BASIC
    max_tokens: int = 2000
    temperature: float = 0.3
    max_retries: int = 3
    include_news: bool = True
    news_hours: int = 24
    news_limit: int = 20


@dataclass
class AnalysisResult:
    """분석 결과"""
    insight: Optional[MarketInsight] = None
    success: bool = False
    error: Optional[str] = None
    provider_used: Optional[str] = None
    model_used: Optional[str] = None
    tokens_used: int = 0
    latency_ms: int = 0
    cost_usd: float = 0.0


class MarketInsightOrchestrator:
    """
    시장 분석 오케스트레이터 (재설계)

    v1 대비 개선사항:
    - 다중 LLM 제공자 지원 (OpenAI, Anthropic)
    - 자동 폴백 및 서킷 브레이커
    - 버전 관리되는 프롬프트 시스템
    - 향상된 에러 처리
    - 메트릭 수집
    """

    def __init__(self):
        self.market_aggregator = MarketDataAggregator()
        self.news_analyzer = NewsAnalyzer()
        self.prompt_engine = PromptEngine()
        self._provider_manager: Optional[LLMProviderManager] = None

    async def _get_provider_manager(self) -> LLMProviderManager:
        """Provider Manager 지연 초기화"""
        if self._provider_manager is None:
            self._provider_manager = await get_provider_manager()
        return self._provider_manager

    async def _collect_market_data(self, symbol: str):
        """
        시장 데이터 수집

        Args:
            symbol: 거래쌍 심볼 (예: BTCUSDT)

        Returns:
            MarketSnapshot 객체
        """
        async with self.market_aggregator:
            return await self.market_aggregator.get_market_snapshot(symbol)

    async def _analyze_news(
        self,
        symbol: str,
        hours: int = 24,
        limit: int = 20
    ) -> List[NewsInsight]:
        """
        뉴스 분석

        Args:
            symbol: 심볼 (BTC, ETH 등)
            hours: 조회 기간 (시간)
            limit: 최대 뉴스 수

        Returns:
            NewsInsight 리스트
        """
        try:
            # USDT 접미사 제거
            clean_symbol = symbol.replace("USDT", "").replace("USD", "")
            return await self.news_analyzer.analyze_recent_news(
                symbol=clean_symbol,
                hours=hours,
                limit=limit
            )
        except Exception as e:
            logger.warning(f"뉴스 분석 실패 (계속 진행): {e}")
            return []

    async def _get_related_news_ids(
        self,
        news_insights: List[NewsInsight]
    ) -> List[int]:
        """뉴스 인사이트에서 뉴스 ID 추출"""
        return [n.news_id for n in news_insights if hasattr(n, 'news_id') and n.news_id]

    async def _save_insight(
        self,
        insight: MarketInsight,
        related_news_ids: List[int]
    ) -> MarketInsight:
        """
        분석 결과 저장

        Args:
            insight: MarketInsight 객체
            related_news_ids: 관련 뉴스 ID 리스트

        Returns:
            저장된 MarketInsight 객체
        """
        async with AsyncSessionLocal() as db:
            try:
                # 관련 뉴스 조회
                if related_news_ids:
                    news_result = await db.execute(
                        select(News).where(News.id.in_(related_news_ids))
                    )
                    related_news = news_result.scalars().all()
                    insight.related_news = list(related_news)

                db.add(insight)
                await db.commit()
                await db.refresh(insight)

                logger.info(
                    f"시장 분석 저장 완료: ID={insight.id}, "
                    f"관련 뉴스={len(related_news_ids)}개"
                )
                return insight
            except Exception as e:
                await db.rollback()
                logger.error(f"시장 분석 저장 실패: {e}")
                raise

    async def generate_insight(
        self,
        config: Optional[AnalysisConfig] = None
    ) -> AnalysisResult:
        """
        시장 분석 생성

        Args:
            config: 분석 설정 (선택)

        Returns:
            AnalysisResult 객체
        """
        config = config or AnalysisConfig()
        start_time = time.time()
        result = AnalysisResult()

        try:
            logger.info(f"시장 분석 시작: {config.symbol}")

            # 1. Provider Manager 초기화
            provider_manager = await self._get_provider_manager()

            if not provider_manager.has_available_providers:
                result.error = "사용 가능한 LLM 제공자가 없습니다. API 키를 확인하세요."
                logger.error(result.error)
                return result

            # 2. 시장 데이터 수집
            logger.info("시장 데이터 수집 중...")
            market_snapshot = await self._collect_market_data(config.symbol)
            logger.info(
                f"시장 데이터 수집 완료: "
                f"가격=${market_snapshot.current_price:,.2f}, "
                f"24h={market_snapshot.price_change_24h:+.2f}%"
            )

            # 3. 뉴스 분석 (옵션)
            news_insights: List[NewsInsight] = []
            if config.include_news:
                logger.info("뉴스 분석 중...")
                news_insights = await self._analyze_news(
                    symbol=config.symbol,
                    hours=config.news_hours,
                    limit=config.news_limit
                )
                logger.info(f"뉴스 분석 완료: {len(news_insights)}개")

            # 4. 프롬프트 빌드
            logger.info(f"프롬프트 생성 중... (버전: {config.prompt_version.value})")
            system_prompt, user_prompt = self.prompt_engine.build_market_analysis_prompt(
                market_snapshot=market_snapshot,
                news_list=news_insights,
                version=config.prompt_version
            )

            # 5. LLM 요청 생성
            llm_request = LLMRequest(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=config.model or "",
                max_tokens=config.max_tokens,
                temperature=config.temperature,
                response_format={"type": "json_object"},
                metadata={
                    "symbol": config.symbol,
                    "prompt_version": config.prompt_version.value,
                }
            )

            # 6. LLM API 호출 (자동 폴백 및 재시도 포함)
            logger.info("LLM API 호출 중...")
            llm_response = await provider_manager.complete_with_retry(
                request=llm_request,
                max_retries=config.max_retries,
                preferred_provider=config.provider
            )

            result.provider_used = llm_response.provider.value
            result.model_used = llm_response.model
            result.tokens_used = llm_response.total_tokens

            logger.info(
                f"LLM 응답 수신: provider={llm_response.provider.value}, "
                f"model={llm_response.model}, "
                f"tokens={llm_response.total_tokens}, "
                f"latency={llm_response.latency_ms}ms"
            )

            # 7. 응답 파싱
            logger.info("응답 파싱 중...")
            parsed_response = parse_gpt_response(llm_response.content)

            # 8. 처리 시간 계산
            processing_time_ms = int((time.time() - start_time) * 1000)
            result.latency_ms = processing_time_ms

            # 9. MarketInsight 객체 생성
            insight = MarketInsight(
                symbol=config.symbol,
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
                ai_model=f"{llm_response.provider.value}/{llm_response.model}",
                processing_time_ms=processing_time_ms,
            )

            # 10. 데이터베이스 저장
            related_news_ids = await self._get_related_news_ids(news_insights)
            insight = await self._save_insight(insight, related_news_ids)

            result.insight = insight
            result.success = True

            logger.info(
                f"시장 분석 완료: {config.symbol}, "
                f"provider={result.provider_used}, "
                f"추천={insight.recommendation.value}, "
                f"처리시간={processing_time_ms}ms"
            )

            return result

        except Exception as e:
            result.error = str(e)
            result.latency_ms = int((time.time() - start_time) * 1000)
            logger.error(f"시장 분석 오류: {e}", exc_info=True)
            return result

    async def get_provider_status(self) -> dict:
        """
        제공자 상태 조회

        Returns:
            제공자 상태 딕셔너리
        """
        provider_manager = await self._get_provider_manager()
        return provider_manager.get_provider_status()

    async def get_metrics_summary(self) -> dict:
        """
        메트릭 요약 조회

        Returns:
            메트릭 요약 딕셔너리
        """
        provider_manager = await self._get_provider_manager()
        return provider_manager.get_metrics_summary()


# 백그라운드 태스크용 전역 인스턴스
_orchestrator: Optional[MarketInsightOrchestrator] = None


async def get_orchestrator() -> MarketInsightOrchestrator:
    """오케스트레이터 싱글톤 반환"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = MarketInsightOrchestrator()
    return _orchestrator


async def run_market_insight_analyzer(
    interval_minutes: int = 5,
    config: Optional[AnalysisConfig] = None
):
    """
    주기적으로 시장 분석 실행 (백그라운드 태스크)

    Args:
        interval_minutes: 분석 간격 (분)
        config: 분석 설정
    """
    orchestrator = await get_orchestrator()
    config = config or AnalysisConfig()

    logger.info(
        f"시장 분석 백그라운드 태스크 시작 "
        f"(간격: {interval_minutes}분, 심볼: {config.symbol})"
    )

    while True:
        try:
            result = await orchestrator.generate_insight(config)

            if result.success and result.insight:
                logger.info(
                    f"[백그라운드] 시장 분석 완료: "
                    f"{result.insight.recommendation.value}, "
                    f"provider={result.provider_used}"
                )
            else:
                logger.warning(f"[백그라운드] 시장 분석 실패: {result.error}")

            await asyncio.sleep(interval_minutes * 60)

        except asyncio.CancelledError:
            logger.info("시장 분석 백그라운드 태스크 종료")
            break
        except Exception as e:
            logger.error(f"[백그라운드] 시장 분석 오류: {e}")
            # 오류 시 1분 후 재시도
            await asyncio.sleep(60)


async def run_multi_symbol_analyzer(
    symbols: List[str],
    interval_minutes: int = 5,
    base_config: Optional[AnalysisConfig] = None
):
    """
    여러 심볼에 대해 주기적으로 시장 분석 실행

    Args:
        symbols: 심볼 리스트 (예: ["BTCUSDT", "ETHUSDT"])
        interval_minutes: 분석 간격 (분)
        base_config: 기본 분석 설정
    """
    orchestrator = await get_orchestrator()
    base_config = base_config or AnalysisConfig()

    logger.info(
        f"다중 심볼 시장 분석 백그라운드 태스크 시작 "
        f"(간격: {interval_minutes}분, 심볼: {symbols})"
    )

    while True:
        try:
            for symbol in symbols:
                config = AnalysisConfig(
                    symbol=symbol,
                    provider=base_config.provider,
                    model=base_config.model,
                    prompt_version=base_config.prompt_version,
                    max_tokens=base_config.max_tokens,
                    temperature=base_config.temperature,
                    max_retries=base_config.max_retries,
                    include_news=base_config.include_news,
                    news_hours=base_config.news_hours,
                    news_limit=base_config.news_limit,
                )

                result = await orchestrator.generate_insight(config)

                if result.success and result.insight:
                    logger.info(
                        f"[다중심볼] {symbol} 분석 완료: "
                        f"{result.insight.recommendation.value}"
                    )
                else:
                    logger.warning(
                        f"[다중심볼] {symbol} 분석 실패: {result.error}"
                    )

                # 심볼 간 간격 (API 레이트 리밋 방지)
                await asyncio.sleep(5)

            await asyncio.sleep(interval_minutes * 60)

        except asyncio.CancelledError:
            logger.info("다중 심볼 시장 분석 백그라운드 태스크 종료")
            break
        except Exception as e:
            logger.error(f"[다중심볼] 시장 분석 오류: {e}")
            await asyncio.sleep(60)
