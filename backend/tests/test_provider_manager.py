"""
Provider Manager 테스트
"""
import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.llm.base_provider import (
    BaseLLMProvider,
    LLMProviderType,
    LLMRequest,
    LLMResponse,
    TokenUsage,
    ProviderHealth,
)
from app.services.llm.provider_manager import (
    LLMProviderManager,
    CircuitBreakerState,
    ProviderMetrics,
)


class MockProvider(BaseLLMProvider):
    """테스트용 Mock 제공자"""

    def __init__(self, provider_type: LLMProviderType, should_fail: bool = False):
        self._provider_type = provider_type
        self._should_fail = should_fail
        self._default_model = "mock-model"
        self._call_count = 0

    @property
    def provider_type(self) -> LLMProviderType:
        return self._provider_type

    async def initialize(self) -> bool:
        return True

    async def complete(self, request: LLMRequest) -> LLMResponse:
        self._call_count += 1
        if self._should_fail:
            raise RuntimeError("Mock failure")
        return LLMResponse(
            content="Mock response",
            model=self._default_model,
            provider=self._provider_type,
            input_tokens=10,
            output_tokens=5,
            total_tokens=15,
            latency_ms=100,
            finish_reason="stop",
        )

    async def stream(self, request: LLMRequest):
        yield "Mock"
        yield " response"

    async def estimate_tokens(self, text: str) -> int:
        return len(text) // 3

    def calculate_cost(self, usage: TokenUsage, model=None) -> float:
        return 0.001

    async def health_check(self) -> ProviderHealth:
        return ProviderHealth(is_healthy=True, available_models=[self._default_model])

    @property
    def available_models(self):
        return [self._default_model]

    @property
    def default_model(self):
        return self._default_model


class TestCircuitBreakerState:
    """CircuitBreakerState 테스트"""

    def test_default_state(self):
        """기본 상태"""
        state = CircuitBreakerState()
        assert state.is_open is False
        assert state.failure_count == 0
        assert state.total_failures == 0
        assert state.total_successes == 0


class TestProviderMetrics:
    """ProviderMetrics 테스트"""

    def test_default_metrics(self):
        """기본 메트릭"""
        metrics = ProviderMetrics()
        assert metrics.total_requests == 0
        assert metrics.successful_requests == 0
        assert metrics.failed_requests == 0
        assert metrics.total_tokens == 0
        assert metrics.total_cost_usd == 0.0

    def test_record_success(self):
        """성공 기록"""
        metrics = ProviderMetrics()
        metrics.record_success(latency_ms=100, tokens=50, cost=0.001)

        assert metrics.total_requests == 1
        assert metrics.successful_requests == 1
        assert metrics.failed_requests == 0
        assert metrics.total_tokens == 50
        assert metrics.total_cost_usd == 0.001
        assert metrics.average_latency_ms == 100.0

    def test_record_multiple_successes(self):
        """여러 번 성공 기록"""
        metrics = ProviderMetrics()
        metrics.record_success(latency_ms=100, tokens=50, cost=0.001)
        metrics.record_success(latency_ms=200, tokens=100, cost=0.002)

        assert metrics.total_requests == 2
        assert metrics.successful_requests == 2
        assert metrics.total_tokens == 150
        assert metrics.total_cost_usd == 0.003
        assert metrics.average_latency_ms == 150.0

    def test_record_failure(self):
        """실패 기록"""
        metrics = ProviderMetrics()
        metrics.record_failure()

        assert metrics.total_requests == 1
        assert metrics.successful_requests == 0
        assert metrics.failed_requests == 1


class TestLLMProviderManager:
    """LLMProviderManager 테스트"""

    def setup_method(self):
        """각 테스트 전 실행"""
        self.manager = LLMProviderManager()

    @pytest.mark.asyncio
    async def test_register_provider(self):
        """제공자 등록"""
        provider = MockProvider(LLMProviderType.OPENAI)
        result = await self.manager.register_provider(provider, is_primary=True)

        assert result is True
        assert LLMProviderType.OPENAI in self.manager._providers
        assert self.manager._primary_provider == LLMProviderType.OPENAI

    @pytest.mark.asyncio
    async def test_register_multiple_providers(self):
        """여러 제공자 등록"""
        provider1 = MockProvider(LLMProviderType.OPENAI)
        provider2 = MockProvider(LLMProviderType.ANTHROPIC)

        await self.manager.register_provider(provider1, is_primary=True)
        await self.manager.register_provider(provider2)

        assert len(self.manager._providers) == 2
        assert self.manager._primary_provider == LLMProviderType.OPENAI

    @pytest.mark.asyncio
    async def test_complete_success(self):
        """완료 요청 성공"""
        provider = MockProvider(LLMProviderType.OPENAI)
        await self.manager.register_provider(provider, is_primary=True)

        request = LLMRequest(
            system_prompt="Test",
            user_prompt="Hello",
        )
        response = await self.manager.complete(request)

        assert response.content == "Mock response"
        assert response.provider == LLMProviderType.OPENAI

    @pytest.mark.asyncio
    async def test_complete_with_fallback(self):
        """폴백으로 완료 요청"""
        failing_provider = MockProvider(LLMProviderType.OPENAI, should_fail=True)
        working_provider = MockProvider(LLMProviderType.ANTHROPIC)

        await self.manager.register_provider(failing_provider, is_primary=True)
        await self.manager.register_provider(working_provider)

        request = LLMRequest(
            system_prompt="Test",
            user_prompt="Hello",
        )
        response = await self.manager.complete(request)

        assert response.provider == LLMProviderType.ANTHROPIC

    @pytest.mark.asyncio
    async def test_complete_all_fail(self):
        """모든 제공자 실패"""
        provider1 = MockProvider(LLMProviderType.OPENAI, should_fail=True)
        provider2 = MockProvider(LLMProviderType.ANTHROPIC, should_fail=True)

        await self.manager.register_provider(provider1, is_primary=True)
        await self.manager.register_provider(provider2)

        request = LLMRequest(
            system_prompt="Test",
            user_prompt="Hello",
        )

        with pytest.raises(RuntimeError) as exc_info:
            await self.manager.complete(request)

        assert "모든 LLM 제공자 요청 실패" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_complete_no_providers(self):
        """제공자 없음"""
        request = LLMRequest(
            system_prompt="Test",
            user_prompt="Hello",
        )

        with pytest.raises(RuntimeError) as exc_info:
            await self.manager.complete(request)

        assert "사용 가능한 LLM 제공자가 없습니다" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_circuit_breaker_opens(self):
        """서킷 브레이커 열림"""
        failing_provider = MockProvider(LLMProviderType.OPENAI, should_fail=True)
        await self.manager.register_provider(failing_provider, is_primary=True)

        request = LLMRequest(
            system_prompt="Test",
            user_prompt="Hello",
        )

        # 3번 실패 시 서킷 브레이커 열림
        for _ in range(3):
            try:
                await self.manager.complete(request)
            except RuntimeError:
                pass

        state = self.manager._circuit_breakers[LLMProviderType.OPENAI]
        assert state.is_open is True
        assert state.failure_count >= self.manager.FAILURE_THRESHOLD

    @pytest.mark.asyncio
    async def test_circuit_breaker_recovery(self):
        """서킷 브레이커 복구"""
        provider = MockProvider(LLMProviderType.OPENAI, should_fail=True)
        await self.manager.register_provider(provider, is_primary=True)

        # 서킷 브레이커 열기
        state = self.manager._circuit_breakers[LLMProviderType.OPENAI]
        state.is_open = True
        state.failure_count = 3
        state.recovery_time = datetime.now() - timedelta(minutes=1)  # 복구 시간 경과

        # 서킷이 닫혀야 함
        is_open = self.manager._is_circuit_open(LLMProviderType.OPENAI)
        assert is_open is False
        assert state.is_open is False
        assert state.failure_count == 0

    @pytest.mark.asyncio
    async def test_preferred_provider(self):
        """선호 제공자 지정"""
        provider1 = MockProvider(LLMProviderType.OPENAI)
        provider2 = MockProvider(LLMProviderType.ANTHROPIC)

        await self.manager.register_provider(provider1, is_primary=True)
        await self.manager.register_provider(provider2)

        request = LLMRequest(
            system_prompt="Test",
            user_prompt="Hello",
        )
        response = await self.manager.complete(
            request,
            preferred_provider=LLMProviderType.ANTHROPIC
        )

        assert response.provider == LLMProviderType.ANTHROPIC

    @pytest.mark.asyncio
    async def test_complete_with_retry(self):
        """재시도로 완료 요청"""
        # 처음 2번 실패, 3번째 성공
        call_count = 0

        class FlakeyProvider(MockProvider):
            async def complete(self, request):
                nonlocal call_count
                call_count += 1
                if call_count < 3:
                    raise RuntimeError("Temporary failure")
                return await super().complete(request)

        provider = FlakeyProvider(LLMProviderType.OPENAI)
        provider._should_fail = False
        await self.manager.register_provider(provider, is_primary=True)

        request = LLMRequest(
            system_prompt="Test",
            user_prompt="Hello",
        )
        response = await self.manager.complete_with_retry(
            request,
            max_retries=3,
            base_delay=0.01  # 테스트용 짧은 딜레이
        )

        assert response is not None
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_get_provider_status(self):
        """제공자 상태 조회"""
        provider = MockProvider(LLMProviderType.OPENAI)
        await self.manager.register_provider(provider, is_primary=True)

        status = self.manager.get_provider_status()

        assert "openai" in status
        assert status["openai"]["is_primary"] is True
        assert status["openai"]["available"] is True
        assert "circuit_breaker" in status["openai"]
        assert "metrics" in status["openai"]

    @pytest.mark.asyncio
    async def test_get_metrics_summary(self):
        """메트릭 요약 조회"""
        provider = MockProvider(LLMProviderType.OPENAI)
        await self.manager.register_provider(provider, is_primary=True)

        summary = self.manager.get_metrics_summary()

        assert "total_requests" in summary
        assert "total_tokens" in summary
        assert "total_cost_usd" in summary
        assert "providers_count" in summary
        assert summary["providers_count"] == 1

    @pytest.mark.asyncio
    async def test_has_available_providers(self):
        """사용 가능한 제공자 존재 여부"""
        assert self.manager.has_available_providers is False

        provider = MockProvider(LLMProviderType.OPENAI)
        await self.manager.register_provider(provider)

        assert self.manager.has_available_providers is True

    def test_set_fallback_order(self):
        """폴백 순서 설정"""
        self.manager._providers = {
            LLMProviderType.OPENAI: MagicMock(),
            LLMProviderType.ANTHROPIC: MagicMock(),
        }

        self.manager.set_fallback_order([
            LLMProviderType.ANTHROPIC,
            LLMProviderType.OPENAI,
        ])

        assert self.manager._fallback_order[0] == LLMProviderType.ANTHROPIC

    def test_set_primary_provider(self):
        """주 제공자 설정"""
        self.manager._providers = {
            LLMProviderType.OPENAI: MagicMock(),
            LLMProviderType.ANTHROPIC: MagicMock(),
        }
        self.manager._primary_provider = LLMProviderType.OPENAI

        self.manager.set_primary_provider(LLMProviderType.ANTHROPIC)

        assert self.manager._primary_provider == LLMProviderType.ANTHROPIC
