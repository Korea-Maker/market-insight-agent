"""
Anthropic Claude LLM 제공자

Claude 3.5 Sonnet, Claude 3 Haiku 등 Anthropic 모델 지원
"""

import time
import logging
from typing import AsyncGenerator, Optional, Dict, List

from app.services.llm.base_provider import (
    BaseLLMProvider,
    LLMProviderType,
    LLMRequest,
    LLMResponse,
    TokenUsage,
    ProviderHealth,
)
from app.core.config import settings


logger = logging.getLogger(__name__)


# 모델별 가격 (1M tokens 기준, USD) - 2024년 기준
ANTHROPIC_PRICING: Dict[str, Dict[str, float]] = {
    "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
    "claude-3-5-sonnet-latest": {"input": 3.00, "output": 15.00},
    "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
    "claude-3-5-haiku-latest": {"input": 0.80, "output": 4.00},
    "claude-3-opus-20240229": {"input": 15.00, "output": 75.00},
    "claude-3-opus-latest": {"input": 15.00, "output": 75.00},
    "claude-3-sonnet-20240229": {"input": 3.00, "output": 15.00},
    "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},
}


class AnthropicProvider(BaseLLMProvider):
    """
    Anthropic Claude LLM 제공자

    지원 모델:
    - claude-3-5-sonnet-20241022 (기본값, 최고 성능)
    - claude-3-5-haiku-20241022 (경제적)
    - claude-3-opus-20240229 (고성능)
    - claude-3-haiku-20240307 (최저가)
    """

    provider_type = LLMProviderType.ANTHROPIC

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: Optional[str] = None,
    ):
        """
        Anthropic 제공자 초기화

        Args:
            api_key: Anthropic API 키 (None이면 환경변수에서 로드)
            default_model: 기본 모델 (None이면 claude-3-5-sonnet-20241022)
        """
        self._api_key = api_key or getattr(settings, 'ANTHROPIC_API_KEY', '')
        self._default_model = default_model or getattr(
            settings, 'ANTHROPIC_DEFAULT_MODEL', 'claude-3-5-sonnet-20241022'
        )
        self._client = None

    async def initialize(self) -> bool:
        """클라이언트 초기화"""
        if not self._api_key:
            logger.warning("Anthropic API 키가 설정되지 않았습니다")
            return False

        try:
            # anthropic 패키지 동적 임포트 (설치되지 않았을 경우 대비)
            from anthropic import AsyncAnthropic
            self._client = AsyncAnthropic(api_key=self._api_key)
            logger.info(f"Anthropic 제공자 초기화 완료 (기본 모델: {self._default_model})")
            return True
        except ImportError:
            logger.warning("anthropic 패키지가 설치되지 않았습니다. pip install anthropic")
            return False
        except Exception as e:
            logger.error(f"Anthropic 제공자 초기화 실패: {e}")
            return False

    async def complete(self, request: LLMRequest) -> LLMResponse:
        """완료 요청"""
        if not self._client:
            raise RuntimeError("Anthropic 클라이언트가 초기화되지 않았습니다")

        start_time = time.time()
        model = request.model or self._default_model

        try:
            response = await self._client.messages.create(
                model=model,
                max_tokens=request.max_tokens,
                system=request.system_prompt,
                messages=[
                    {"role": "user", "content": request.user_prompt}
                ],
            )

            latency_ms = int((time.time() - start_time) * 1000)

            # 응답 텍스트 추출
            content = ""
            if response.content:
                for block in response.content:
                    if hasattr(block, 'text'):
                        content += block.text

            return LLMResponse(
                content=content,
                model=response.model,
                provider=self.provider_type,
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                total_tokens=response.usage.input_tokens + response.usage.output_tokens,
                latency_ms=latency_ms,
                finish_reason=response.stop_reason or "unknown",
                raw_response=response.model_dump() if hasattr(response, 'model_dump') else None,
            )
        except Exception as e:
            logger.error(f"Anthropic 요청 실패: {e}")
            raise RuntimeError(f"Anthropic 요청 실패: {e}")

    async def stream(self, request: LLMRequest) -> AsyncGenerator[str, None]:
        """스트리밍 응답"""
        if not self._client:
            raise RuntimeError("Anthropic 클라이언트가 초기화되지 않았습니다")

        model = request.model or self._default_model

        try:
            async with self._client.messages.stream(
                model=model,
                max_tokens=request.max_tokens,
                system=request.system_prompt,
                messages=[
                    {"role": "user", "content": request.user_prompt}
                ],
            ) as stream:
                async for text in stream.text_stream:
                    yield text
        except Exception as e:
            logger.error(f"Anthropic 스트리밍 실패: {e}")
            raise RuntimeError(f"Anthropic 스트리밍 실패: {e}")

    async def estimate_tokens(self, text: str) -> int:
        """
        토큰 수 추정

        Claude의 토큰화는 OpenAI와 유사하지만 약간 더 효율적
        평균 3.5자당 1토큰으로 추정
        """
        return len(text) // 3

    def calculate_cost(self, usage: TokenUsage, model: Optional[str] = None) -> float:
        """비용 계산"""
        model = model or self._default_model
        pricing = ANTHROPIC_PRICING.get(
            model,
            ANTHROPIC_PRICING["claude-3-5-sonnet-20241022"]
        )

        input_cost = (usage.input_tokens / 1_000_000) * pricing["input"]
        output_cost = (usage.output_tokens / 1_000_000) * pricing["output"]

        return round(input_cost + output_cost, 6)

    async def health_check(self) -> ProviderHealth:
        """상태 확인"""
        if not self._client:
            return ProviderHealth(
                is_healthy=False,
                error_message="클라이언트가 초기화되지 않았습니다",
            )

        # Anthropic은 모델 목록 API가 없으므로 간단한 확인만 수행
        return ProviderHealth(
            is_healthy=True,
            available_models=list(ANTHROPIC_PRICING.keys()),
        )

    @property
    def available_models(self) -> List[str]:
        """사용 가능한 모델 목록"""
        return list(ANTHROPIC_PRICING.keys())

    @property
    def default_model(self) -> str:
        """기본 모델"""
        return self._default_model
