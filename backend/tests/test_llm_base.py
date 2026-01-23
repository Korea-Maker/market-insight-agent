"""
LLM Base Provider 테스트
"""
import pytest
from app.services.llm.base_provider import (
    LLMProviderType,
    LLMRequest,
    LLMResponse,
    TokenUsage,
    ProviderHealth,
)


class TestLLMProviderType:
    """LLMProviderType 테스트"""

    def test_provider_types_exist(self):
        """모든 제공자 타입이 정의되어 있는지 확인"""
        assert LLMProviderType.OPENAI == "openai"
        assert LLMProviderType.ANTHROPIC == "anthropic"
        assert LLMProviderType.GOOGLE == "google"
        assert LLMProviderType.AZURE_OPENAI == "azure_openai"

    def test_provider_type_is_string(self):
        """제공자 타입이 문자열로 변환 가능한지 확인"""
        assert str(LLMProviderType.OPENAI) == "LLMProviderType.OPENAI"
        assert LLMProviderType.OPENAI.value == "openai"


class TestLLMRequest:
    """LLMRequest 테스트"""

    def test_request_creation_minimal(self):
        """최소 필드로 요청 생성"""
        request = LLMRequest(
            system_prompt="You are a helpful assistant.",
            user_prompt="Hello, world!",
        )
        assert request.system_prompt == "You are a helpful assistant."
        assert request.user_prompt == "Hello, world!"
        assert request.model == ""
        assert request.max_tokens == 2000
        assert request.temperature == 0.3
        assert request.response_format is None
        assert request.stream is False

    def test_request_creation_full(self):
        """모든 필드로 요청 생성"""
        request = LLMRequest(
            system_prompt="System prompt",
            user_prompt="User prompt",
            model="gpt-4o",
            max_tokens=1000,
            temperature=0.7,
            response_format={"type": "json_object"},
            stream=True,
            metadata={"key": "value"},
        )
        assert request.model == "gpt-4o"
        assert request.max_tokens == 1000
        assert request.temperature == 0.7
        assert request.response_format == {"type": "json_object"}
        assert request.stream is True
        assert request.metadata == {"key": "value"}


class TestLLMResponse:
    """LLMResponse 테스트"""

    def test_response_creation(self):
        """응답 객체 생성"""
        response = LLMResponse(
            content="Hello!",
            model="gpt-4o-mini",
            provider=LLMProviderType.OPENAI,
            input_tokens=10,
            output_tokens=5,
            total_tokens=15,
            latency_ms=500,
            finish_reason="stop",
        )
        assert response.content == "Hello!"
        assert response.model == "gpt-4o-mini"
        assert response.provider == LLMProviderType.OPENAI
        assert response.total_tokens == 15
        assert response.latency_ms == 500


class TestTokenUsage:
    """TokenUsage 테스트"""

    def test_token_usage_creation(self):
        """토큰 사용량 객체 생성"""
        usage = TokenUsage(
            input_tokens=100,
            output_tokens=50,
            total_tokens=150,
            estimated_cost_usd=0.001,
        )
        assert usage.input_tokens == 100
        assert usage.output_tokens == 50
        assert usage.total_tokens == 150
        assert usage.estimated_cost_usd == 0.001

    def test_token_usage_default_cost(self):
        """기본 비용 0"""
        usage = TokenUsage(
            input_tokens=100,
            output_tokens=50,
            total_tokens=150,
        )
        assert usage.estimated_cost_usd == 0.0


class TestProviderHealth:
    """ProviderHealth 테스트"""

    def test_health_healthy(self):
        """정상 상태"""
        health = ProviderHealth(
            is_healthy=True,
            latency_ms=100,
            available_models=["gpt-4o", "gpt-4o-mini"],
        )
        assert health.is_healthy is True
        assert health.latency_ms == 100
        assert len(health.available_models) == 2

    def test_health_unhealthy(self):
        """비정상 상태"""
        health = ProviderHealth(
            is_healthy=False,
            error_message="Connection refused",
        )
        assert health.is_healthy is False
        assert health.error_message == "Connection refused"
