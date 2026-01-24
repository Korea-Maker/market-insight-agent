"""
LLM Provider Manager

다중 제공자 관리, 자동 폴백, 서킷 브레이커 패턴 구현
"""

import asyncio
import logging
from typing import Dict, Optional, List
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from app.services.llm.base_provider import (
    BaseLLMProvider,
    LLMProviderType,
    LLMRequest,
    LLMResponse,
    TokenUsage,
)
from app.core.config import settings


logger = logging.getLogger(__name__)


@dataclass
class CircuitBreakerState:
    """서킷 브레이커 상태"""
    is_open: bool = False
    failure_count: int = 0
    last_failure_time: Optional[datetime] = None
    recovery_time: Optional[datetime] = None
    total_failures: int = 0
    total_successes: int = 0


@dataclass
class ProviderMetrics:
    """제공자 메트릭"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    total_tokens: int = 0
    total_cost_usd: float = 0.0
    average_latency_ms: float = 0.0
    _latencies: List[int] = field(default_factory=list)

    def record_success(self, latency_ms: int, tokens: int, cost: float):
        """성공 기록"""
        self.total_requests += 1
        self.successful_requests += 1
        self.total_tokens += tokens
        self.total_cost_usd += cost
        self._latencies.append(latency_ms)
        # 최근 100개만 유지
        if len(self._latencies) > 100:
            self._latencies = self._latencies[-100:]
        self.average_latency_ms = sum(self._latencies) / len(self._latencies)

    def record_failure(self):
        """실패 기록"""
        self.total_requests += 1
        self.failed_requests += 1


class LLMProviderManager:
    """
    LLM 제공자 관리자

    기능:
    - 다중 제공자 등록 및 관리
    - 자동 폴백 (주 제공자 실패 시)
    - 서킷 브레이커 패턴
    - 메트릭 수집
    - 지수 백오프 재시도
    """

    # 서킷 브레이커 설정
    FAILURE_THRESHOLD = 3  # 연속 실패 횟수
    RECOVERY_TIMEOUT = timedelta(minutes=5)  # 복구 대기 시간

    def __init__(self):
        self._providers: Dict[LLMProviderType, BaseLLMProvider] = {}
        self._circuit_breakers: Dict[LLMProviderType, CircuitBreakerState] = {}
        self._metrics: Dict[LLMProviderType, ProviderMetrics] = {}
        self._primary_provider: Optional[LLMProviderType] = None
        self._fallback_order: List[LLMProviderType] = []
        self._initialized = False

    async def register_provider(
        self,
        provider: BaseLLMProvider,
        is_primary: bool = False
    ) -> bool:
        """
        제공자 등록

        Args:
            provider: LLM 제공자 인스턴스
            is_primary: 주 제공자 여부

        Returns:
            등록 성공 여부
        """
        try:
            initialized = await provider.initialize()
            if not initialized:
                logger.warning(f"{provider.provider_type.value} 초기화 실패 (API 키 없음 또는 연결 실패)")
                return False

            self._providers[provider.provider_type] = provider
            self._circuit_breakers[provider.provider_type] = CircuitBreakerState()
            self._metrics[provider.provider_type] = ProviderMetrics()

            if is_primary or self._primary_provider is None:
                self._primary_provider = provider.provider_type

            if provider.provider_type not in self._fallback_order:
                self._fallback_order.append(provider.provider_type)

            logger.info(
                f"{provider.provider_type.value} 등록 완료 "
                f"(기본 모델: {provider.default_model}, "
                f"주 제공자: {is_primary or self._primary_provider == provider.provider_type})"
            )
            return True

        except Exception as e:
            logger.error(f"{provider.provider_type.value} 등록 실패: {e}")
            return False

    def set_fallback_order(self, order: List[LLMProviderType]):
        """폴백 순서 설정"""
        self._fallback_order = [p for p in order if p in self._providers]
        logger.info(f"폴백 순서 설정: {[p.value for p in self._fallback_order]}")

    def set_primary_provider(self, provider_type: LLMProviderType):
        """주 제공자 설정"""
        if provider_type in self._providers:
            self._primary_provider = provider_type
            logger.info(f"주 제공자 설정: {provider_type.value}")

    def _is_circuit_open(self, provider_type: LLMProviderType) -> bool:
        """서킷 브레이커 상태 확인"""
        state = self._circuit_breakers.get(provider_type)
        if not state or not state.is_open:
            return False

        # 복구 시간 경과 확인
        if state.recovery_time and datetime.now() >= state.recovery_time:
            state.is_open = False
            state.failure_count = 0
            logger.info(f"{provider_type.value} 서킷 브레이커 복구 (반-열림 상태)")
            return False

        return True

    def _record_failure(self, provider_type: LLMProviderType):
        """실패 기록"""
        state = self._circuit_breakers.get(provider_type)
        metrics = self._metrics.get(provider_type)

        if state:
            state.failure_count += 1
            state.total_failures += 1
            state.last_failure_time = datetime.now()

            if state.failure_count >= self.FAILURE_THRESHOLD:
                state.is_open = True
                state.recovery_time = datetime.now() + self.RECOVERY_TIMEOUT
                logger.warning(
                    f"{provider_type.value} 서킷 브레이커 열림 "
                    f"(연속 실패: {state.failure_count}, "
                    f"복구 예정: {state.recovery_time.strftime('%H:%M:%S')})"
                )

        if metrics:
            metrics.record_failure()

    def _record_success(
        self,
        provider_type: LLMProviderType,
        response: LLMResponse
    ):
        """성공 기록"""
        state = self._circuit_breakers.get(provider_type)
        metrics = self._metrics.get(provider_type)
        provider = self._providers.get(provider_type)

        if state:
            state.failure_count = 0
            state.is_open = False
            state.total_successes += 1

        if metrics and provider:
            usage = TokenUsage(
                input_tokens=response.input_tokens,
                output_tokens=response.output_tokens,
                total_tokens=response.total_tokens,
            )
            cost = provider.calculate_cost(usage, response.model)
            metrics.record_success(
                latency_ms=response.latency_ms,
                tokens=response.total_tokens,
                cost=cost,
            )

    def _get_available_providers(self) -> List[LLMProviderType]:
        """사용 가능한 제공자 목록 (폴백 순서대로)"""
        available = []

        # 주 제공자 우선
        if (self._primary_provider and
            self._primary_provider in self._providers and
            not self._is_circuit_open(self._primary_provider)):
            available.append(self._primary_provider)

        # 폴백 순서대로 추가
        for provider_type in self._fallback_order:
            if (provider_type not in available and
                provider_type in self._providers and
                not self._is_circuit_open(provider_type)):
                available.append(provider_type)

        return available

    async def complete(
        self,
        request: LLMRequest,
        preferred_provider: Optional[LLMProviderType] = None
    ) -> LLMResponse:
        """
        LLM 완료 요청 (자동 폴백 포함)

        Args:
            request: LLM 요청
            preferred_provider: 선호 제공자 (선택)

        Returns:
            LLMResponse

        Raises:
            RuntimeError: 모든 제공자 실패 시
        """
        providers_to_try = self._get_available_providers()

        # 선호 제공자 우선 처리
        if (preferred_provider and
            preferred_provider in providers_to_try):
            providers_to_try.remove(preferred_provider)
            providers_to_try.insert(0, preferred_provider)

        if not providers_to_try:
            raise RuntimeError(
                "사용 가능한 LLM 제공자가 없습니다. "
                "API 키를 확인하거나 서킷 브레이커 복구를 기다려주세요."
            )

        last_error = None

        for provider_type in providers_to_try:
            provider = self._providers[provider_type]

            try:
                logger.info(
                    f"{provider_type.value}로 요청 시도 "
                    f"(모델: {request.model or provider.default_model})"
                )
                response = await provider.complete(request)
                self._record_success(provider_type, response)

                logger.info(
                    f"{provider_type.value} 요청 성공 "
                    f"(토큰: {response.total_tokens}, "
                    f"지연: {response.latency_ms}ms)"
                )
                return response

            except Exception as e:
                logger.warning(f"{provider_type.value} 요청 실패: {e}")
                self._record_failure(provider_type)
                last_error = e

        raise RuntimeError(f"모든 LLM 제공자 요청 실패: {last_error}")

    async def complete_with_retry(
        self,
        request: LLMRequest,
        max_retries: int = 3,
        base_delay: float = 1.0,
        preferred_provider: Optional[LLMProviderType] = None
    ) -> LLMResponse:
        """
        지수 백오프 재시도를 포함한 완료 요청

        Args:
            request: LLM 요청
            max_retries: 최대 재시도 횟수
            base_delay: 기본 대기 시간 (초)
            preferred_provider: 선호 제공자 (선택)

        Returns:
            LLMResponse
        """
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                return await self.complete(request, preferred_provider)
            except Exception as e:
                last_error = e

                if attempt < max_retries:
                    delay = base_delay * (2 ** attempt)
                    logger.info(
                        f"재시도 {attempt + 1}/{max_retries}, "
                        f"{delay:.1f}초 후 재시도"
                    )
                    await asyncio.sleep(delay)

        raise RuntimeError(f"최대 재시도 횟수 초과: {last_error}")

    def get_provider_status(self) -> Dict[str, dict]:
        """모든 제공자 상태 조회"""
        status = {}

        for provider_type, provider in self._providers.items():
            cb_state = self._circuit_breakers.get(provider_type)
            metrics = self._metrics.get(provider_type)

            status[provider_type.value] = {
                "available": not self._is_circuit_open(provider_type),
                "is_primary": provider_type == self._primary_provider,
                "default_model": provider.default_model,
                "circuit_breaker": {
                    "is_open": cb_state.is_open if cb_state else False,
                    "failure_count": cb_state.failure_count if cb_state else 0,
                    "total_failures": cb_state.total_failures if cb_state else 0,
                    "total_successes": cb_state.total_successes if cb_state else 0,
                    "recovery_time": (
                        cb_state.recovery_time.isoformat()
                        if cb_state and cb_state.recovery_time
                        else None
                    ),
                },
                "metrics": {
                    "total_requests": metrics.total_requests if metrics else 0,
                    "successful_requests": metrics.successful_requests if metrics else 0,
                    "failed_requests": metrics.failed_requests if metrics else 0,
                    "total_tokens": metrics.total_tokens if metrics else 0,
                    "total_cost_usd": round(metrics.total_cost_usd, 4) if metrics else 0,
                    "average_latency_ms": round(metrics.average_latency_ms, 1) if metrics else 0,
                },
                "available_models": provider.available_models,
            }

        return status

    def get_metrics_summary(self) -> Dict[str, any]:
        """전체 메트릭 요약"""
        total_requests = 0
        total_tokens = 0
        total_cost = 0.0

        for metrics in self._metrics.values():
            total_requests += metrics.total_requests
            total_tokens += metrics.total_tokens
            total_cost += metrics.total_cost_usd

        return {
            "total_requests": total_requests,
            "total_tokens": total_tokens,
            "total_cost_usd": round(total_cost, 4),
            "providers_count": len(self._providers),
            "primary_provider": (
                self._primary_provider.value
                if self._primary_provider
                else None
            ),
        }

    @property
    def has_available_providers(self) -> bool:
        """사용 가능한 제공자 존재 여부"""
        return len(self._get_available_providers()) > 0


# 싱글톤 인스턴스
_provider_manager: Optional[LLMProviderManager] = None
_init_lock = asyncio.Lock()


async def get_provider_manager() -> LLMProviderManager:
    """
    Provider Manager 싱글톤 반환

    최초 호출 시 OpenAI, Anthropic 제공자 자동 등록
    """
    global _provider_manager

    async with _init_lock:
        if _provider_manager is None:
            _provider_manager = LLMProviderManager()

            # OpenAI 등록 시도 (주 제공자)
            from app.services.llm.providers.openai_provider import OpenAIProvider
            openai_provider = OpenAIProvider()
            await _provider_manager.register_provider(openai_provider, is_primary=True)

            # Anthropic 등록 시도 (폴백)
            from app.services.llm.providers.anthropic_provider import AnthropicProvider
            anthropic_provider = AnthropicProvider()
            await _provider_manager.register_provider(anthropic_provider)

            # 설정에서 폴백 순서 로드
            fallback_order_str = getattr(settings, 'LLM_FALLBACK_ORDER', 'openai,anthropic')
            fallback_order = []
            for provider_name in fallback_order_str.split(','):
                provider_name = provider_name.strip().lower()
                if provider_name == 'openai':
                    fallback_order.append(LLMProviderType.OPENAI)
                elif provider_name == 'anthropic':
                    fallback_order.append(LLMProviderType.ANTHROPIC)

            if fallback_order:
                _provider_manager.set_fallback_order(fallback_order)

            # 주 제공자 설정
            primary_str = getattr(settings, 'LLM_PRIMARY_PROVIDER', 'openai')
            if primary_str == 'anthropic':
                _provider_manager.set_primary_provider(LLMProviderType.ANTHROPIC)

            logger.info(
                f"Provider Manager 초기화 완료 "
                f"(제공자: {len(_provider_manager._providers)}개)"
            )

    return _provider_manager


async def reset_provider_manager():
    """Provider Manager 리셋 (테스트용)"""
    global _provider_manager
    _provider_manager = None
