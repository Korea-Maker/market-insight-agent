# AI 분석 파이프라인 재설계 (GPT 모델 통합)

## Component Design Specification

**버전**: 2.0
**작성일**: 2024-01-23
**타입**: Component Architecture Design

---

## 1. 설계 개요

### 1.1 현재 시스템 분석

현재 `MarketInsightEngine`은 단일 OpenAI 클라이언트에 의존하는 구조:

```
┌─────────────────────────────────────────────────────────┐
│                  MarketInsightEngine                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ MarketData  │  │ NewsAnalyzer│  │ AsyncOpenAI     │  │
│  │ Aggregator  │  │             │  │ (직접 의존)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**문제점**:
- 단일 LLM 제공자(OpenAI)에 강결합
- 모델 전환 시 코드 수정 필요
- 프롬프트 관리가 하드코딩
- 에러 처리 및 재시도 로직 부재
- 스트리밍 응답 미지원
- 비용/토큰 추적 기능 없음

### 1.2 재설계 목표

1. **다중 LLM 제공자 지원**: OpenAI, Anthropic Claude, Google Gemini, Azure OpenAI
2. **유연한 프롬프트 관리**: 템플릿 기반 + 버전 관리
3. **강건한 에러 처리**: 지수 백오프, 폴백 제공자
4. **실시간 스트리밍**: SSE를 통한 분석 진행 상황 전달
5. **비용 최적화**: 토큰 추적, 캐싱, 모델 자동 선택

---

## 2. 컴포넌트 아키텍처

### 2.1 전체 구조

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AI Analysis Pipeline v2.0                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    MarketInsightOrchestrator                      │  │
│  │  (파이프라인 조율, 데이터 수집, 분석 실행, 결과 저장)             │  │
│  └────────────────────────────┬─────────────────────────────────────┘  │
│                               │                                          │
│  ┌────────────────────────────┼─────────────────────────────────────┐  │
│  │                            ▼                                      │  │
│  │  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │  │
│  │  │ DataCollector│  │ PromptEngine   │  │ LLMProviderManager │  │  │
│  │  │             │  │                 │  │                     │  │  │
│  │  │ • Market    │  │ • TemplateStore │  │ • ProviderRegistry │  │  │
│  │  │ • News      │  │ • PromptBuilder │  │ • LoadBalancer     │  │  │
│  │  │ • Sentiment │  │ • VersionControl│  │ • CircuitBreaker   │  │  │
│  │  └─────────────┘  └─────────────────┘  └─────────────────────┘  │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                               │                                          │
│  ┌────────────────────────────┼─────────────────────────────────────┐  │
│  │                            ▼                                      │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                    LLM Abstraction Layer                     │  │  │
│  │  ├─────────────────────────────────────────────────────────────┤  │  │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │  │
│  │  │  │ OpenAI  │  │ Claude  │  │ Gemini  │  │ Azure OpenAI    │  │  │
│  │  │  │ Provider│  │ Provider│  │ Provider│  │ Provider        │  │  │
│  │  │  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                               │                                          │
│  ┌────────────────────────────┼─────────────────────────────────────┐  │
│  │                            ▼                                      │  │
│  │  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │  │
│  │  │ ResponseProc│  │ TokenTracker   │  │ AnalyticsCollector  │  │  │
│  │  │             │  │                 │  │                     │  │  │
│  │  │ • Parser    │  │ • Usage Count  │  │ • Latency           │  │  │
│  │  │ • Validator │  │ • Cost Calc    │  │ • Success Rate      │  │  │
│  │  │ • Normalizer│  │ • Budget Alert │  │ • Model Performance │  │  │
│  │  └─────────────┘  └─────────────────┘  └─────────────────────┘  │  │
│  │                                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 핵심 컴포넌트 설계

### 3.1 LLM Provider 추상화 계층

#### 3.1.1 BaseLLMProvider (추상 베이스 클래스)

```python
# backend/app/services/llm/base_provider.py

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncGenerator, Optional, Dict, Any
from enum import Enum


class LLMProviderType(str, Enum):
    """지원되는 LLM 제공자"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    AZURE_OPENAI = "azure_openai"


@dataclass
class LLMRequest:
    """LLM 요청 데이터"""
    system_prompt: str
    user_prompt: str
    model: str
    max_tokens: int = 2000
    temperature: float = 0.3
    response_format: Optional[Dict[str, Any]] = None
    stream: bool = False


@dataclass
class LLMResponse:
    """LLM 응답 데이터"""
    content: str
    model: str
    provider: LLMProviderType
    input_tokens: int
    output_tokens: int
    total_tokens: int
    latency_ms: int
    finish_reason: str


@dataclass
class TokenUsage:
    """토큰 사용량"""
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost_usd: float


class BaseLLMProvider(ABC):
    """LLM 제공자 추상 베이스 클래스"""

    provider_type: LLMProviderType

    @abstractmethod
    async def initialize(self) -> bool:
        """제공자 초기화 및 연결 확인"""
        pass

    @abstractmethod
    async def complete(self, request: LLMRequest) -> LLMResponse:
        """동기식 완료 요청"""
        pass

    @abstractmethod
    async def stream(self, request: LLMRequest) -> AsyncGenerator[str, None]:
        """스트리밍 응답"""
        pass

    @abstractmethod
    async def estimate_tokens(self, text: str) -> int:
        """토큰 수 추정"""
        pass

    @abstractmethod
    def calculate_cost(self, usage: TokenUsage) -> float:
        """비용 계산 (USD)"""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """상태 확인"""
        pass

    @property
    @abstractmethod
    def available_models(self) -> list[str]:
        """사용 가능한 모델 목록"""
        pass
```

#### 3.1.2 OpenAI Provider 구현

```python
# backend/app/services/llm/providers/openai_provider.py

import time
from typing import AsyncGenerator, Optional, Dict, Any
from openai import AsyncOpenAI

from app.services.llm.base_provider import (
    BaseLLMProvider, LLMProviderType, LLMRequest,
    LLMResponse, TokenUsage
)
from app.core.config import settings


# 모델별 가격 (1M tokens 기준, USD)
OPENAI_PRICING = {
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4-turbo": {"input": 10.00, "output": 30.00},
    "gpt-4": {"input": 30.00, "output": 60.00},
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
    "o1": {"input": 15.00, "output": 60.00},
    "o1-mini": {"input": 3.00, "output": 12.00},
}


class OpenAIProvider(BaseLLMProvider):
    """OpenAI LLM 제공자"""

    provider_type = LLMProviderType.OPENAI

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.client: Optional[AsyncOpenAI] = None
        self._default_model = "gpt-4o-mini"

    async def initialize(self) -> bool:
        """클라이언트 초기화"""
        if not self.api_key:
            return False

        self.client = AsyncOpenAI(api_key=self.api_key)
        return await self.health_check()

    async def complete(self, request: LLMRequest) -> LLMResponse:
        """완료 요청"""
        if not self.client:
            raise RuntimeError("OpenAI 클라이언트가 초기화되지 않았습니다")

        start_time = time.time()

        messages = [
            {"role": "system", "content": request.system_prompt},
            {"role": "user", "content": request.user_prompt}
        ]

        kwargs: Dict[str, Any] = {
            "model": request.model or self._default_model,
            "messages": messages,
            "max_completion_tokens": request.max_tokens,
            "temperature": request.temperature,
        }

        if request.response_format:
            kwargs["response_format"] = request.response_format

        response = await self.client.chat.completions.create(**kwargs)

        latency_ms = int((time.time() - start_time) * 1000)

        return LLMResponse(
            content=response.choices[0].message.content,
            model=response.model,
            provider=self.provider_type,
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
            total_tokens=response.usage.total_tokens,
            latency_ms=latency_ms,
            finish_reason=response.choices[0].finish_reason
        )

    async def stream(self, request: LLMRequest) -> AsyncGenerator[str, None]:
        """스트리밍 응답"""
        if not self.client:
            raise RuntimeError("OpenAI 클라이언트가 초기화되지 않았습니다")

        messages = [
            {"role": "system", "content": request.system_prompt},
            {"role": "user", "content": request.user_prompt}
        ]

        stream = await self.client.chat.completions.create(
            model=request.model or self._default_model,
            messages=messages,
            max_completion_tokens=request.max_tokens,
            temperature=request.temperature,
            stream=True
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def estimate_tokens(self, text: str) -> int:
        """토큰 수 추정 (간이 계산)"""
        # 평균적으로 영어 4자, 한글 2자당 1토큰
        return len(text) // 3

    def calculate_cost(self, usage: TokenUsage) -> float:
        """비용 계산"""
        # 기본 모델 가격 사용
        pricing = OPENAI_PRICING.get(self._default_model, OPENAI_PRICING["gpt-4o-mini"])

        input_cost = (usage.input_tokens / 1_000_000) * pricing["input"]
        output_cost = (usage.output_tokens / 1_000_000) * pricing["output"]

        return input_cost + output_cost

    async def health_check(self) -> bool:
        """상태 확인"""
        try:
            await self.client.models.list()
            return True
        except Exception:
            return False

    @property
    def available_models(self) -> list[str]:
        """사용 가능한 모델 목록"""
        return list(OPENAI_PRICING.keys())
```

#### 3.1.3 Anthropic Claude Provider 구현

```python
# backend/app/services/llm/providers/anthropic_provider.py

import time
from typing import AsyncGenerator, Optional
from anthropic import AsyncAnthropic

from app.services.llm.base_provider import (
    BaseLLMProvider, LLMProviderType, LLMRequest,
    LLMResponse, TokenUsage
)
from app.core.config import settings


# Claude 모델별 가격 (1M tokens 기준, USD)
ANTHROPIC_PRICING = {
    "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
    "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
    "claude-3-opus-20240229": {"input": 15.00, "output": 75.00},
    "claude-3-sonnet-20240229": {"input": 3.00, "output": 15.00},
    "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},
}


class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude LLM 제공자"""

    provider_type = LLMProviderType.ANTHROPIC

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or getattr(settings, 'ANTHROPIC_API_KEY', '')
        self.client: Optional[AsyncAnthropic] = None
        self._default_model = "claude-3-5-sonnet-20241022"

    async def initialize(self) -> bool:
        """클라이언트 초기화"""
        if not self.api_key:
            return False

        self.client = AsyncAnthropic(api_key=self.api_key)
        return True  # Anthropic은 별도 health check 불필요

    async def complete(self, request: LLMRequest) -> LLMResponse:
        """완료 요청"""
        if not self.client:
            raise RuntimeError("Anthropic 클라이언트가 초기화되지 않았습니다")

        start_time = time.time()

        response = await self.client.messages.create(
            model=request.model or self._default_model,
            max_tokens=request.max_tokens,
            system=request.system_prompt,
            messages=[
                {"role": "user", "content": request.user_prompt}
            ]
        )

        latency_ms = int((time.time() - start_time) * 1000)

        return LLMResponse(
            content=response.content[0].text,
            model=response.model,
            provider=self.provider_type,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            total_tokens=response.usage.input_tokens + response.usage.output_tokens,
            latency_ms=latency_ms,
            finish_reason=response.stop_reason
        )

    async def stream(self, request: LLMRequest) -> AsyncGenerator[str, None]:
        """스트리밍 응답"""
        if not self.client:
            raise RuntimeError("Anthropic 클라이언트가 초기화되지 않았습니다")

        async with self.client.messages.stream(
            model=request.model or self._default_model,
            max_tokens=request.max_tokens,
            system=request.system_prompt,
            messages=[
                {"role": "user", "content": request.user_prompt}
            ]
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def estimate_tokens(self, text: str) -> int:
        """토큰 수 추정"""
        return len(text) // 3

    def calculate_cost(self, usage: TokenUsage) -> float:
        """비용 계산"""
        pricing = ANTHROPIC_PRICING.get(
            self._default_model,
            ANTHROPIC_PRICING["claude-3-5-sonnet-20241022"]
        )

        input_cost = (usage.input_tokens / 1_000_000) * pricing["input"]
        output_cost = (usage.output_tokens / 1_000_000) * pricing["output"]

        return input_cost + output_cost

    async def health_check(self) -> bool:
        """상태 확인"""
        return self.client is not None

    @property
    def available_models(self) -> list[str]:
        """사용 가능한 모델 목록"""
        return list(ANTHROPIC_PRICING.keys())
```

### 3.2 LLM Provider Manager

```python
# backend/app/services/llm/provider_manager.py

import asyncio
import logging
from typing import Dict, Optional, List
from dataclasses import dataclass
from datetime import datetime, timedelta

from app.services.llm.base_provider import (
    BaseLLMProvider, LLMProviderType, LLMRequest, LLMResponse
)
from app.services.llm.providers.openai_provider import OpenAIProvider
from app.services.llm.providers.anthropic_provider import AnthropicProvider


logger = logging.getLogger(__name__)


@dataclass
class CircuitBreakerState:
    """서킷 브레이커 상태"""
    is_open: bool = False
    failure_count: int = 0
    last_failure_time: Optional[datetime] = None
    recovery_time: datetime = None


class LLMProviderManager:
    """
    LLM 제공자 관리자

    기능:
    - 다중 제공자 등록 및 관리
    - 자동 폴백 (주 제공자 실패 시)
    - 서킷 브레이커 패턴
    - 로드 밸런싱 (라운드 로빈)
    """

    # 서킷 브레이커 설정
    FAILURE_THRESHOLD = 3  # 연속 실패 횟수
    RECOVERY_TIMEOUT = timedelta(minutes=5)  # 복구 대기 시간

    def __init__(self):
        self._providers: Dict[LLMProviderType, BaseLLMProvider] = {}
        self._circuit_breakers: Dict[LLMProviderType, CircuitBreakerState] = {}
        self._primary_provider: Optional[LLMProviderType] = None
        self._fallback_order: List[LLMProviderType] = []

    async def register_provider(
        self,
        provider: BaseLLMProvider,
        is_primary: bool = False
    ) -> bool:
        """제공자 등록"""
        try:
            initialized = await provider.initialize()
            if not initialized:
                logger.warning(f"{provider.provider_type.value} 초기화 실패")
                return False

            self._providers[provider.provider_type] = provider
            self._circuit_breakers[provider.provider_type] = CircuitBreakerState()

            if is_primary or self._primary_provider is None:
                self._primary_provider = provider.provider_type

            if provider.provider_type not in self._fallback_order:
                self._fallback_order.append(provider.provider_type)

            logger.info(f"{provider.provider_type.value} 등록 완료")
            return True

        except Exception as e:
            logger.error(f"{provider.provider_type.value} 등록 실패: {e}")
            return False

    def set_fallback_order(self, order: List[LLMProviderType]):
        """폴백 순서 설정"""
        self._fallback_order = order

    def _is_circuit_open(self, provider_type: LLMProviderType) -> bool:
        """서킷 브레이커 상태 확인"""
        state = self._circuit_breakers.get(provider_type)
        if not state or not state.is_open:
            return False

        # 복구 시간 경과 확인
        if datetime.now() >= state.recovery_time:
            state.is_open = False
            state.failure_count = 0
            logger.info(f"{provider_type.value} 서킷 브레이커 복구")
            return False

        return True

    def _record_failure(self, provider_type: LLMProviderType):
        """실패 기록"""
        state = self._circuit_breakers.get(provider_type)
        if not state:
            return

        state.failure_count += 1
        state.last_failure_time = datetime.now()

        if state.failure_count >= self.FAILURE_THRESHOLD:
            state.is_open = True
            state.recovery_time = datetime.now() + self.RECOVERY_TIMEOUT
            logger.warning(
                f"{provider_type.value} 서킷 브레이커 오픈 "
                f"(복구 예정: {state.recovery_time})"
            )

    def _record_success(self, provider_type: LLMProviderType):
        """성공 기록"""
        state = self._circuit_breakers.get(provider_type)
        if state:
            state.failure_count = 0
            state.is_open = False

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
            raise RuntimeError("사용 가능한 LLM 제공자가 없습니다")

        last_error = None

        for provider_type in providers_to_try:
            provider = self._providers[provider_type]

            try:
                logger.info(f"{provider_type.value}로 요청 시도")
                response = await provider.complete(request)
                self._record_success(provider_type)
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
        base_delay: float = 1.0
    ) -> LLMResponse:
        """
        지수 백오프 재시도를 포함한 완료 요청

        Args:
            request: LLM 요청
            max_retries: 최대 재시도 횟수
            base_delay: 기본 대기 시간 (초)

        Returns:
            LLMResponse
        """
        last_error = None

        for attempt in range(max_retries + 1):
            try:
                return await self.complete(request)
            except Exception as e:
                last_error = e

                if attempt < max_retries:
                    delay = base_delay * (2 ** attempt)
                    logger.info(f"재시도 {attempt + 1}/{max_retries}, {delay:.1f}초 대기")
                    await asyncio.sleep(delay)

        raise RuntimeError(f"최대 재시도 횟수 초과: {last_error}")

    def get_provider_status(self) -> Dict[str, dict]:
        """모든 제공자 상태 조회"""
        status = {}

        for provider_type, provider in self._providers.items():
            cb_state = self._circuit_breakers.get(provider_type)

            status[provider_type.value] = {
                "available": not self._is_circuit_open(provider_type),
                "is_primary": provider_type == self._primary_provider,
                "circuit_breaker": {
                    "is_open": cb_state.is_open if cb_state else False,
                    "failure_count": cb_state.failure_count if cb_state else 0,
                },
                "models": provider.available_models
            }

        return status


# 싱글톤 인스턴스
_provider_manager: Optional[LLMProviderManager] = None


async def get_provider_manager() -> LLMProviderManager:
    """Provider Manager 싱글톤 반환"""
    global _provider_manager

    if _provider_manager is None:
        _provider_manager = LLMProviderManager()

        # OpenAI 등록 (주 제공자)
        openai_provider = OpenAIProvider()
        await _provider_manager.register_provider(openai_provider, is_primary=True)

        # Anthropic 등록 (폴백)
        anthropic_provider = AnthropicProvider()
        await _provider_manager.register_provider(anthropic_provider)

    return _provider_manager
```

### 3.3 Prompt Engine

```python
# backend/app/services/llm/prompt_engine.py

import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from jinja2 import Environment, BaseLoader, TemplateError

from app.services.market_data_aggregator import MarketSnapshot
from app.services.news_analyzer import NewsInsight


logger = logging.getLogger(__name__)


class PromptVersion(str, Enum):
    """프롬프트 버전"""
    V1_BASIC = "v1_basic"
    V2_DETAILED = "v2_detailed"
    V3_EXPERT = "v3_expert"


@dataclass
class PromptTemplate:
    """프롬프트 템플릿"""
    name: str
    version: PromptVersion
    system_prompt: str
    user_prompt_template: str
    description: str = ""
    required_vars: List[str] = field(default_factory=list)


# 프롬프트 템플릿 저장소
PROMPT_TEMPLATES: Dict[str, PromptTemplate] = {
    "market_analysis_v1": PromptTemplate(
        name="market_analysis",
        version=PromptVersion.V1_BASIC,
        description="기본 시장 분석 프롬프트",
        system_prompt="""당신은 암호화폐 시장 분석 전문가입니다.
실시간 가격 데이터, 기술적 지표, 최신 뉴스를 종합하여 투자자에게 명확하고 실용적인 분석을 제공합니다.

분석 원칙:
1. 객관적 데이터 기반 분석
2. 명확한 근거 제시
3. 위험 요소 명시
4. 한국어로 이해하기 쉽게 설명

반드시 유효한 JSON 형식으로만 응답하세요.""",
        user_prompt_template="""## 시장 데이터 ({{ symbol }})

### 가격 정보
- 현재 가격: ${{ current_price | format_currency }}
- 1시간 변동률: {{ price_change_1h }}%
- 24시간 변동률: {{ price_change_24h }}%
- 7일 변동률: {{ price_change_7d }}%

### 거래량
- 24시간 거래량: ${{ volume_24h | format_currency }}
- 거래량 변화율: {{ volume_change_24h }}%

### 기술적 지표
- RSI(14): {{ rsi_14 }}
- MACD: {{ macd }}
- MACD Signal: {{ macd_signal }}
- 볼린저 밴드 상단: ${{ bb_upper | format_currency }}
- 볼린저 밴드 중단: ${{ bb_middle | format_currency }}
- 볼린저 밴드 하단: ${{ bb_lower | format_currency }}

### 변동성
- 24시간 변동성: {{ volatility_24h }}%

## 최근 뉴스 분석
{% for news in news_list[:10] %}
{{ loop.index }}. **{{ news.title }}**
   - 소스: {{ news.source }}
   - 감성: {{ news.sentiment_label }} ({{ news.sentiment_score }})
   - 중요도: {{ news.importance }}
   - 시장 영향: {{ news.market_impact }}
{% endfor %}

위 데이터를 종합하여 다음 JSON 형식으로 시장 분석을 제공해주세요:
{
  "summary": "전체 시장 상황 요약 (2-3문장)",
  "price_reason": "가격이 현재 변동하는 주요 원인 (3-4문장)",
  "recommendation": "strong_buy|buy|hold|sell|strong_sell",
  "recommendation_reason": "추천 근거 (3-4문장)",
  "risk_level": "low|medium|high|very_high",
  "sentiment_score": 0-100 (숫자),
  "sentiment_label": "매우 긍정적|긍정적|중립|부정적|매우 부정적"
}""",
        required_vars=["symbol", "current_price", "price_change_1h", "price_change_24h"]
    ),

    "market_analysis_v2": PromptTemplate(
        name="market_analysis",
        version=PromptVersion.V2_DETAILED,
        description="상세 시장 분석 프롬프트 (더 긴 분석)",
        system_prompt="""당신은 10년 이상 경력의 암호화폐 시장 분석 전문가입니다.
헤지펀드와 기관 투자자에게 자문을 제공해온 경험을 바탕으로 분석합니다.

분석 프레임워크:
1. 기술적 분석 (Technical Analysis)
   - 추세 분석: 상승/하락/횡보
   - 모멘텀 지표: RSI, MACD 해석
   - 가격대 분석: 지지선, 저항선

2. 펀더멘털 분석 (Fundamental Analysis)
   - 네트워크 활동
   - 거래량 패턴
   - 뉴스 영향도

3. 감성 분석 (Sentiment Analysis)
   - 시장 심리 지표
   - 뉴스 톤 분석
   - 공포/탐욕 수준

투자 경고: 모든 분석은 참고용이며, 투자 결정의 책임은 투자자에게 있습니다.

반드시 유효한 JSON 형식으로만 응답하세요.""",
        user_prompt_template="""# {{ symbol }} 종합 시장 분석 요청

## 1. 가격 데이터
| 지표 | 값 |
|------|-----|
| 현재 가격 | ${{ current_price | format_currency }} |
| 1시간 변동 | {{ price_change_1h }}% |
| 24시간 변동 | {{ price_change_24h }}% |
| 7일 변동 | {{ price_change_7d }}% |

## 2. 거래량 분석
- 24시간 거래량: ${{ volume_24h | format_currency }}
- 거래량 변화율: {{ volume_change_24h }}%
- 거래량 추세: {{ "상승" if volume_change_24h > 0 else "하락" }}

## 3. 기술적 지표
### 모멘텀
- RSI(14): {{ rsi_14 }} {% if rsi_14 > 70 %}(과매수 구간){% elif rsi_14 < 30 %}(과매도 구간){% else %}(중립){% endif %}
- MACD: {{ macd }} / Signal: {{ macd_signal }}
- MACD 크로스: {{ "골든크로스" if macd > macd_signal else "데드크로스" }}

### 볼린저 밴드
- 상단: ${{ bb_upper | format_currency }}
- 중단: ${{ bb_middle | format_currency }}
- 하단: ${{ bb_lower | format_currency }}
- 현재 위치: {{ "상단 근접" if current_price > bb_middle * 1.02 else "하단 근접" if current_price < bb_middle * 0.98 else "중앙대" }}

### 변동성
- 24시간 변동성: {{ volatility_24h }}%
- 변동성 수준: {{ "고" if volatility_24h > 5 else "중" if volatility_24h > 2 else "저" }}

## 4. 뉴스 인사이트 (최근 24시간)
{% if news_list %}
{% for news in news_list[:10] %}
### 뉴스 {{ loop.index }}
- 제목: {{ news.title }}
- 소스: {{ news.source }}
- 감성: {{ news.sentiment_label }} (점수: {{ news.sentiment_score }})
- 중요도: {{ news.importance }}/1.0
- 예상 시장 영향: {{ news.market_impact }}
{% endfor %}
{% else %}
관련 뉴스 없음
{% endif %}

---

위 데이터를 종합 분석하여 다음 JSON 형식으로 응답해주세요:
```json
{
  "summary": "전체 시장 상황 요약 (3-4문장, 핵심 포인트 중심)",
  "price_reason": "가격 변동의 주요 원인 분석 (기술적+펀더멘털 요인)",
  "recommendation": "strong_buy|buy|hold|sell|strong_sell",
  "recommendation_reason": "추천 근거 (진입/청산 포인트 포함)",
  "risk_level": "low|medium|high|very_high",
  "sentiment_score": 0-100,
  "sentiment_label": "매우 긍정적|긍정적|중립|부정적|매우 부정적"
}
```""",
        required_vars=["symbol", "current_price"]
    )
}


class PromptEngine:
    """
    프롬프트 엔진

    기능:
    - Jinja2 기반 템플릿 렌더링
    - 버전 관리
    - 커스텀 필터 지원
    """

    def __init__(self):
        self._env = Environment(loader=BaseLoader())
        self._register_filters()

    def _register_filters(self):
        """커스텀 Jinja2 필터 등록"""
        self._env.filters['format_currency'] = lambda x: f"{x:,.2f}" if x else "0.00"
        self._env.filters['format_percent'] = lambda x: f"{x:+.2f}%" if x else "0.00%"

    def get_template(
        self,
        name: str,
        version: Optional[PromptVersion] = None
    ) -> Optional[PromptTemplate]:
        """템플릿 조회"""
        key = f"{name}_{version.value}" if version else f"{name}_v1_basic"
        return PROMPT_TEMPLATES.get(key)

    def render_prompt(
        self,
        template: PromptTemplate,
        context: Dict[str, Any]
    ) -> str:
        """프롬프트 렌더링"""
        try:
            jinja_template = self._env.from_string(template.user_prompt_template)
            return jinja_template.render(**context)
        except TemplateError as e:
            logger.error(f"프롬프트 렌더링 오류: {e}")
            raise

    def build_market_analysis_prompt(
        self,
        market: MarketSnapshot,
        news_list: List[NewsInsight],
        version: PromptVersion = PromptVersion.V1_BASIC
    ) -> tuple[str, str]:
        """
        시장 분석 프롬프트 빌드

        Returns:
            (system_prompt, user_prompt)
        """
        template = self.get_template("market_analysis", version)

        if not template:
            raise ValueError(f"템플릿을 찾을 수 없습니다: market_analysis_{version.value}")

        # 뉴스 리스트를 딕셔너리로 변환
        news_dicts = [
            {
                "title": n.title,
                "source": n.source,
                "sentiment": n.sentiment,
                "sentiment_score": f"{n.sentiment_score:+.2f}",
                "sentiment_label": {
                    "positive": "긍정적",
                    "negative": "부정적",
                    "neutral": "중립"
                }.get(n.sentiment, "중립"),
                "importance": f"{n.importance:.2f}",
                "market_impact": n.market_impact
            }
            for n in news_list
        ]

        context = {
            "symbol": market.symbol,
            "current_price": market.current_price,
            "price_change_1h": f"{market.price_change_1h:+.2f}",
            "price_change_24h": f"{market.price_change_24h:+.2f}",
            "price_change_7d": f"{market.price_change_7d:+.2f}",
            "volume_24h": market.volume_24h,
            "volume_change_24h": f"{market.volume_change_24h:+.2f}",
            "rsi_14": f"{market.rsi_14:.2f}" if market.rsi_14 else "N/A",
            "macd": f"{market.macd:.2f}" if market.macd else "N/A",
            "macd_signal": f"{market.macd_signal:.2f}" if market.macd_signal else "N/A",
            "bb_upper": market.bb_upper or market.current_price,
            "bb_middle": market.bb_middle or market.current_price,
            "bb_lower": market.bb_lower or market.current_price,
            "volatility_24h": f"{market.volatility_24h:.2f}" if market.volatility_24h else "N/A",
            "news_list": news_dicts
        }

        user_prompt = self.render_prompt(template, context)

        return template.system_prompt, user_prompt
```

---

## 4. 재설계된 MarketInsightOrchestrator

```python
# backend/app/services/market_insight_orchestrator.py

import time
import asyncio
import logging
from typing import Optional, List
from dataclasses import dataclass

from app.core.database import AsyncSessionLocal
from app.models.market_insight import MarketInsight, TradingRecommendation, RiskLevel
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


class MarketInsightOrchestrator:
    """
    시장 분석 오케스트레이터 (재설계)

    v1 대비 개선사항:
    - 다중 LLM 제공자 지원
    - 자동 폴백 및 서킷 브레이커
    - 버전 관리되는 프롬프트 시스템
    - 향상된 에러 처리
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
        """시장 데이터 수집"""
        async with self.market_aggregator:
            return await self.market_aggregator.get_market_snapshot(symbol)

    async def _analyze_news(self, symbol: str) -> List[NewsInsight]:
        """뉴스 분석"""
        try:
            return await self.news_analyzer.analyze_recent_news(
                symbol=symbol.replace("USDT", ""),
                hours=24,
                limit=20
            )
        except Exception as e:
            logger.warning(f"뉴스 분석 실패 (계속 진행): {e}")
            return []

    async def _save_insight(self, insight: MarketInsight) -> MarketInsight:
        """분석 결과 저장"""
        async with AsyncSessionLocal() as db:
            db.add(insight)
            await db.commit()
            await db.refresh(insight)
            logger.info(f"시장 분석 저장 완료: ID={insight.id}")
            return insight

    async def generate_insight(
        self,
        config: Optional[AnalysisConfig] = None
    ) -> Optional[MarketInsight]:
        """
        시장 분석 생성

        Args:
            config: 분석 설정 (선택)

        Returns:
            MarketInsight 객체 또는 None
        """
        config = config or AnalysisConfig()
        start_time = time.time()

        try:
            logger.info(f"시장 분석 시작: {config.symbol}")

            # 1. Provider Manager 초기화
            provider_manager = await self._get_provider_manager()

            # 2. 시장 데이터 수집
            market_snapshot = await self._collect_market_data(config.symbol)
            logger.info(f"시장 데이터 수집 완료: 가격=${market_snapshot.current_price:,.2f}")

            # 3. 뉴스 분석
            news_insights = await self._analyze_news(config.symbol)
            logger.info(f"뉴스 분석 완료: {len(news_insights)}개")

            # 4. 프롬프트 빌드
            system_prompt, user_prompt = self.prompt_engine.build_market_analysis_prompt(
                market=market_snapshot,
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
                response_format={"type": "json_object"}
            )

            # 6. LLM API 호출 (자동 폴백 및 재시도 포함)
            llm_response = await provider_manager.complete_with_retry(
                request=llm_request,
                max_retries=config.max_retries
            )
            logger.info(
                f"LLM 응답 수신: provider={llm_response.provider.value}, "
                f"tokens={llm_response.total_tokens}"
            )

            # 7. 응답 파싱
            parsed_response = parse_gpt_response(llm_response.content)

            # 8. 처리 시간 계산
            processing_time_ms = int((time.time() - start_time) * 1000)

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
                processing_time_ms=processing_time_ms
            )

            # 10. 데이터베이스 저장
            insight = await self._save_insight(insight)

            logger.info(
                f"시장 분석 완료: {config.symbol}, "
                f"provider={llm_response.provider.value}, "
                f"추천={insight.recommendation.value}, "
                f"처리시간={processing_time_ms}ms"
            )

            return insight

        except Exception as e:
            logger.error(f"시장 분석 오류: {e}", exc_info=True)
            raise

    async def get_provider_status(self) -> dict:
        """제공자 상태 조회"""
        provider_manager = await self._get_provider_manager()
        return provider_manager.get_provider_status()


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
    orchestrator = MarketInsightOrchestrator()
    config = config or AnalysisConfig()

    logger.info(f"시장 분석 백그라운드 태스크 시작 (간격: {interval_minutes}분)")

    while True:
        try:
            insight = await orchestrator.generate_insight(config)
            if insight:
                logger.info(f"시장 분석 완료: {insight.recommendation.value}")
            await asyncio.sleep(interval_minutes * 60)

        except asyncio.CancelledError:
            logger.info("시장 분석 백그라운드 태스크 종료")
            break
        except Exception as e:
            logger.error(f"시장 분석 오류: {e}")
            await asyncio.sleep(60)  # 오류 시 1분 후 재시도
```

---

## 5. 설정 확장

```python
# backend/app/core/config.py (추가 설정)

class Settings(BaseSettings):
    # ... 기존 설정 ...

    # OpenAI API 설정
    OPENAI_API_KEY: str = ""
    OPENAI_DEFAULT_MODEL: str = "gpt-4o-mini"

    # Anthropic API 설정 (신규)
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_DEFAULT_MODEL: str = "claude-3-5-sonnet-20241022"

    # Google AI 설정 (신규)
    GOOGLE_AI_API_KEY: str = ""
    GOOGLE_DEFAULT_MODEL: str = "gemini-1.5-pro"

    # Azure OpenAI 설정 (신규)
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_DEPLOYMENT: str = ""

    # LLM 파이프라인 설정 (신규)
    LLM_PRIMARY_PROVIDER: str = "openai"  # openai, anthropic, google, azure_openai
    LLM_FALLBACK_ORDER: str = "openai,anthropic,google"  # 쉼표 구분
    LLM_MAX_RETRIES: int = 3
    LLM_CIRCUIT_BREAKER_THRESHOLD: int = 3
    LLM_CIRCUIT_BREAKER_RECOVERY_MINUTES: int = 5

    # 분석 설정
    ANALYSIS_INTERVAL_MINUTES: int = 5
    ANALYSIS_PROMPT_VERSION: str = "v1_basic"  # v1_basic, v2_detailed
```

---

## 6. 디렉토리 구조

```
backend/app/services/
├── llm/
│   ├── __init__.py
│   ├── base_provider.py         # 추상 베이스 클래스
│   ├── provider_manager.py      # 제공자 관리 (폴백, 서킷 브레이커)
│   ├── prompt_engine.py         # 프롬프트 템플릿 엔진
│   └── providers/
│       ├── __init__.py
│       ├── openai_provider.py   # OpenAI 구현체
│       ├── anthropic_provider.py # Claude 구현체
│       ├── google_provider.py   # Gemini 구현체 (선택)
│       └── azure_provider.py    # Azure OpenAI 구현체 (선택)
├── market_insight_orchestrator.py  # 재설계된 메인 엔진
├── market_insight_engine.py        # (레거시, 호환성 유지)
├── market_data_aggregator.py
├── news_analyzer.py
├── response_parser.py
└── prompts.py                      # (레거시, 호환성 유지)
```

---

## 7. 시퀀스 다이어그램

```
┌─────────┐  ┌───────────────────┐  ┌────────────────┐  ┌─────────────────┐
│ Trigger │  │ MarketInsight     │  │ Provider       │  │ LLM Provider    │
│ (cron)  │  │ Orchestrator      │  │ Manager        │  │ (OpenAI/Claude) │
└────┬────┘  └─────────┬─────────┘  └───────┬────────┘  └────────┬────────┘
     │                 │                     │                    │
     │ generate_insight()                    │                    │
     │────────────────>│                     │                    │
     │                 │                     │                    │
     │                 │ collect_market_data()                    │
     │                 │──────────┐          │                    │
     │                 │          │          │                    │
     │                 │<─────────┘          │                    │
     │                 │                     │                    │
     │                 │ analyze_news()      │                    │
     │                 │──────────┐          │                    │
     │                 │          │          │                    │
     │                 │<─────────┘          │                    │
     │                 │                     │                    │
     │                 │ build_prompt()      │                    │
     │                 │──────────┐          │                    │
     │                 │          │          │                    │
     │                 │<─────────┘          │                    │
     │                 │                     │                    │
     │                 │ complete_with_retry(request)             │
     │                 │────────────────────>│                    │
     │                 │                     │                    │
     │                 │                     │ check_circuit_breaker()
     │                 │                     │──────────┐         │
     │                 │                     │          │         │
     │                 │                     │<─────────┘         │
     │                 │                     │                    │
     │                 │                     │ complete(request)  │
     │                 │                     │───────────────────>│
     │                 │                     │                    │
     │                 │                     │    LLMResponse     │
     │                 │                     │<───────────────────│
     │                 │                     │                    │
     │                 │    LLMResponse      │                    │
     │                 │<────────────────────│                    │
     │                 │                     │                    │
     │                 │ parse_response()    │                    │
     │                 │──────────┐          │                    │
     │                 │          │          │                    │
     │                 │<─────────┘          │                    │
     │                 │                     │                    │
     │                 │ save_insight()      │                    │
     │                 │──────────┐          │                    │
     │                 │          │          │                    │
     │                 │<─────────┘          │                    │
     │                 │                     │                    │
     │  MarketInsight  │                     │                    │
     │<────────────────│                     │                    │
     │                 │                     │                    │
```

---

## 8. 폴백 플로우

```
┌─────────────────────────────────────────────────────────────────────┐
│                       LLM 요청 폴백 플로우                           │
└─────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   요청 시작   │
                    └──────┬───────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Primary Provider       │
              │ (OpenAI) 시도          │
              └────────────┬───────────┘
                           │
                    ┌──────┴──────┐
                    │   성공?      │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │ Yes        │            │ No
              ▼            │            ▼
     ┌────────────────┐    │   ┌────────────────────┐
     │ 응답 반환      │    │   │ 서킷 브레이커 확인 │
     │ (OpenAI)       │    │   │ 실패 카운트 증가   │
     └────────────────┘    │   └─────────┬──────────┘
                           │             │
                           │             ▼
                           │   ┌────────────────────┐
                           │   │ Fallback Provider  │
                           │   │ (Claude) 시도      │
                           │   └─────────┬──────────┘
                           │             │
                           │      ┌──────┴──────┐
                           │      │   성공?      │
                           │      └──────┬──────┘
                           │             │
                           │   ┌─────────┼─────────┐
                           │   │ Yes     │         │ No
                           │   ▼         │         ▼
                           │ ┌──────────────┐ ┌──────────────────┐
                           │ │ 응답 반환    │ │ 재시도 (지수 백오프) │
                           │ │ (Claude)     │ │ 또는 에러 반환    │
                           │ └──────────────┘ └──────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   완료       │
                    └──────────────┘
```

---

## 9. 마이그레이션 가이드

### 9.1 환경 변수 추가

```bash
# .env 파일에 추가
ANTHROPIC_API_KEY=sk-ant-xxxx  # Claude 사용 시

# 제공자 설정 (선택)
LLM_PRIMARY_PROVIDER=openai
LLM_FALLBACK_ORDER=openai,anthropic
```

### 9.2 의존성 설치

```bash
pip install anthropic  # Claude 사용 시
```

### 9.3 코드 마이그레이션

기존 `MarketInsightEngine` 사용 코드:
```python
# 기존 (v1)
engine = MarketInsightEngine()
insight = await engine.generate_insight("BTCUSDT")
```

새로운 `MarketInsightOrchestrator` 사용:
```python
# 신규 (v2)
from app.services.market_insight_orchestrator import (
    MarketInsightOrchestrator,
    AnalysisConfig
)

orchestrator = MarketInsightOrchestrator()

# 기본 설정
insight = await orchestrator.generate_insight()

# 커스텀 설정
config = AnalysisConfig(
    symbol="ETHUSDT",
    provider=LLMProviderType.ANTHROPIC,
    prompt_version=PromptVersion.V2_DETAILED
)
insight = await orchestrator.generate_insight(config)
```

---

## 10. 다음 단계

이 설계가 승인되면 `/sc:implement`를 사용하여 구현을 진행합니다:

1. `backend/app/services/llm/` 디렉토리 구조 생성
2. `BaseLLMProvider` 추상 클래스 구현
3. `OpenAIProvider` 구현
4. `AnthropicProvider` 구현
5. `LLMProviderManager` 구현
6. `PromptEngine` 구현
7. `MarketInsightOrchestrator` 구현
8. 기존 코드와의 호환성 테스트
9. 환경 변수 및 설정 업데이트

---

**설계 상태**: 검토 대기
**예상 구현 파일**: 8개 신규 파일, 2개 수정
**호환성**: 기존 `MarketInsightEngine` 유지 (레거시 지원)
