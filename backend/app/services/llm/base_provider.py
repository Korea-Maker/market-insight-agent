"""
LLM Provider 추상 베이스 클래스

모든 LLM 제공자가 구현해야 하는 인터페이스 정의
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncGenerator, Optional, Dict, Any, List
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
    model: str = ""  # 빈 문자열이면 제공자 기본값 사용
    max_tokens: int = 2000
    temperature: float = 0.3
    response_format: Optional[Dict[str, Any]] = None
    stream: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


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
    raw_response: Optional[Dict[str, Any]] = None


@dataclass
class TokenUsage:
    """토큰 사용량"""
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost_usd: float = 0.0


@dataclass
class ProviderHealth:
    """제공자 상태"""
    is_healthy: bool
    latency_ms: Optional[int] = None
    error_message: Optional[str] = None
    available_models: List[str] = field(default_factory=list)


class BaseLLMProvider(ABC):
    """
    LLM 제공자 추상 베이스 클래스

    모든 LLM 제공자 구현체가 상속해야 하는 인터페이스
    """

    provider_type: LLMProviderType

    @abstractmethod
    async def initialize(self) -> bool:
        """
        제공자 초기화 및 연결 확인

        Returns:
            초기화 성공 여부
        """
        pass

    @abstractmethod
    async def complete(self, request: LLMRequest) -> LLMResponse:
        """
        동기식 완료 요청

        Args:
            request: LLM 요청 데이터

        Returns:
            LLM 응답 데이터

        Raises:
            RuntimeError: 요청 실패 시
        """
        pass

    @abstractmethod
    async def stream(self, request: LLMRequest) -> AsyncGenerator[str, None]:
        """
        스트리밍 응답

        Args:
            request: LLM 요청 데이터

        Yields:
            응답 텍스트 청크
        """
        pass

    @abstractmethod
    async def estimate_tokens(self, text: str) -> int:
        """
        토큰 수 추정

        Args:
            text: 추정할 텍스트

        Returns:
            예상 토큰 수
        """
        pass

    @abstractmethod
    def calculate_cost(self, usage: TokenUsage, model: Optional[str] = None) -> float:
        """
        비용 계산 (USD)

        Args:
            usage: 토큰 사용량
            model: 모델명 (None이면 기본 모델)

        Returns:
            예상 비용 (USD)
        """
        pass

    @abstractmethod
    async def health_check(self) -> ProviderHealth:
        """
        상태 확인

        Returns:
            제공자 상태 정보
        """
        pass

    @property
    @abstractmethod
    def available_models(self) -> List[str]:
        """사용 가능한 모델 목록"""
        pass

    @property
    @abstractmethod
    def default_model(self) -> str:
        """기본 모델"""
        pass

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} provider={self.provider_type.value}>"
