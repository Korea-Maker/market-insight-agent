"""
LLM 추상화 계층

다중 LLM 제공자 지원을 위한 추상화 계층
- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Haiku)
- Google (Gemini) - 향후 지원
- Azure OpenAI - 향후 지원
"""

from app.services.llm.base_provider import (
    BaseLLMProvider,
    LLMProviderType,
    LLMRequest,
    LLMResponse,
    TokenUsage,
)
from app.services.llm.provider_manager import (
    LLMProviderManager,
    get_provider_manager,
)
from app.services.llm.prompt_engine import (
    PromptEngine,
    PromptVersion,
    PromptTemplate,
)

__all__ = [
    # Base
    "BaseLLMProvider",
    "LLMProviderType",
    "LLMRequest",
    "LLMResponse",
    "TokenUsage",
    # Manager
    "LLMProviderManager",
    "get_provider_manager",
    # Prompt
    "PromptEngine",
    "PromptVersion",
    "PromptTemplate",
]
