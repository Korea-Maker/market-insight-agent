"""
OpenAI LLM 제공자

GPT-4o, GPT-4o-mini, GPT-4-turbo 등 OpenAI 모델 지원
"""

import time
import logging
from typing import AsyncGenerator, Optional, Dict, Any, List

from openai import AsyncOpenAI

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
OPENAI_PRICING: Dict[str, Dict[str, float]] = {
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4-turbo": {"input": 10.00, "output": 30.00},
    "gpt-4-turbo-preview": {"input": 10.00, "output": 30.00},
    "gpt-4": {"input": 30.00, "output": 60.00},
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    "gpt-3.5-turbo-0125": {"input": 0.50, "output": 1.50},
    "o1": {"input": 15.00, "output": 60.00},
    "o1-mini": {"input": 3.00, "output": 12.00},
    "o1-preview": {"input": 15.00, "output": 60.00},
}


class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI LLM 제공자

    지원 모델:
    - gpt-4o (기본값)
    - gpt-4o-mini (경제적)
    - gpt-4-turbo
    - gpt-3.5-turbo
    - o1, o1-mini (추론 모델)
    """

    provider_type = LLMProviderType.OPENAI

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: Optional[str] = None,
        organization: Optional[str] = None,
    ):
        """
        OpenAI 제공자 초기화

        Args:
            api_key: OpenAI API 키 (None이면 환경변수에서 로드)
            default_model: 기본 모델 (None이면 gpt-4o-mini)
            organization: 조직 ID (선택)
        """
        self._api_key = api_key or settings.OPENAI_API_KEY
        self._default_model = default_model or getattr(
            settings, 'OPENAI_DEFAULT_MODEL', 'gpt-4o-mini'
        )
        self._organization = organization
        self._client: Optional[AsyncOpenAI] = None

    async def initialize(self) -> bool:
        """클라이언트 초기화"""
        if not self._api_key:
            logger.warning("OpenAI API 키가 설정되지 않았습니다")
            return False

        try:
            self._client = AsyncOpenAI(
                api_key=self._api_key,
                organization=self._organization,
            )
            # 간단한 연결 확인
            health = await self.health_check()
            if health.is_healthy:
                logger.info(f"OpenAI 제공자 초기화 완료 (기본 모델: {self._default_model})")
                return True
            else:
                logger.warning(f"OpenAI 제공자 상태 이상: {health.error_message}")
                return False
        except Exception as e:
            logger.error(f"OpenAI 제공자 초기화 실패: {e}")
            return False

    async def complete(self, request: LLMRequest) -> LLMResponse:
        """완료 요청"""
        if not self._client:
            raise RuntimeError("OpenAI 클라이언트가 초기화되지 않았습니다")

        start_time = time.time()
        model = request.model or self._default_model

        messages = [
            {"role": "system", "content": request.system_prompt},
            {"role": "user", "content": request.user_prompt}
        ]

        kwargs: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": request.temperature,
        }

        # o1 시리즈는 max_completion_tokens 사용
        if model.startswith("o1"):
            kwargs["max_completion_tokens"] = request.max_tokens
        else:
            kwargs["max_tokens"] = request.max_tokens

        # JSON 응답 형식 설정
        if request.response_format and not model.startswith("o1"):
            kwargs["response_format"] = request.response_format

        try:
            response = await self._client.chat.completions.create(**kwargs)

            latency_ms = int((time.time() - start_time) * 1000)

            return LLMResponse(
                content=response.choices[0].message.content or "",
                model=response.model,
                provider=self.provider_type,
                input_tokens=response.usage.prompt_tokens if response.usage else 0,
                output_tokens=response.usage.completion_tokens if response.usage else 0,
                total_tokens=response.usage.total_tokens if response.usage else 0,
                latency_ms=latency_ms,
                finish_reason=response.choices[0].finish_reason or "unknown",
                raw_response=response.model_dump() if hasattr(response, 'model_dump') else None,
            )
        except Exception as e:
            logger.error(f"OpenAI 요청 실패: {e}")
            raise RuntimeError(f"OpenAI 요청 실패: {e}")

    async def stream(self, request: LLMRequest) -> AsyncGenerator[str, None]:
        """스트리밍 응답"""
        if not self._client:
            raise RuntimeError("OpenAI 클라이언트가 초기화되지 않았습니다")

        model = request.model or self._default_model

        # o1 시리즈는 스트리밍 미지원
        if model.startswith("o1"):
            response = await self.complete(request)
            yield response.content
            return

        messages = [
            {"role": "system", "content": request.system_prompt},
            {"role": "user", "content": request.user_prompt}
        ]

        try:
            stream = await self._client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"OpenAI 스트리밍 실패: {e}")
            raise RuntimeError(f"OpenAI 스트리밍 실패: {e}")

    async def estimate_tokens(self, text: str) -> int:
        """
        토큰 수 추정

        Note: 정확한 계산을 위해서는 tiktoken 라이브러리 사용 권장
        여기서는 간이 추정 사용 (평균 4자당 1토큰)
        """
        # 영어는 약 4자당 1토큰, 한글은 약 2자당 1토큰
        # 혼합 텍스트 기준 평균 3자당 1토큰으로 추정
        return len(text) // 3

    def calculate_cost(self, usage: TokenUsage, model: Optional[str] = None) -> float:
        """비용 계산"""
        model = model or self._default_model
        pricing = OPENAI_PRICING.get(model, OPENAI_PRICING["gpt-4o-mini"])

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

        start_time = time.time()
        try:
            # 모델 목록 조회로 API 연결 확인
            models = await self._client.models.list()
            latency_ms = int((time.time() - start_time) * 1000)

            # GPT 모델만 필터링
            gpt_models = [
                m.id for m in models.data
                if m.id.startswith(("gpt-", "o1"))
            ]

            return ProviderHealth(
                is_healthy=True,
                latency_ms=latency_ms,
                available_models=gpt_models[:20],  # 최대 20개
            )
        except Exception as e:
            return ProviderHealth(
                is_healthy=False,
                error_message=str(e),
            )

    @property
    def available_models(self) -> List[str]:
        """사용 가능한 모델 목록"""
        return list(OPENAI_PRICING.keys())

    @property
    def default_model(self) -> str:
        """기본 모델"""
        return self._default_model
