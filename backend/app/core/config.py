"""
애플리케이션 설정
환경 변수 관리를 위해 Pydantic Settings 사용
"""
import secrets
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """환경 변수에서 로드되는 애플리케이션 설정"""

    # API 설정
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    ENVIRONMENT: str = "development"

    # CORS 설정
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "*",
    ]

    # 데이터베이스 설정
    POSTGRES_USER: str = "quantboard"
    POSTGRES_PASSWORD: str = "quantboard_dev"
    POSTGRES_DB: str = "quantboard"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # Redis 설정
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # JWT 설정
    JWT_SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OAuth 설정 (Google)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/oauth/google/callback"

    # OAuth 설정 (GitHub)
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/auth/oauth/github/callback"

    # Frontend URL (OAuth 콜백 후 리다이렉트)
    FRONTEND_URL: str = "http://localhost:3000"

    # OpenAI API 설정 (시장 분석용, 선택적)
    OPENAI_API_KEY: str = ""
    OPENAI_DEFAULT_MODEL: str = "gpt-4o-mini"

    # Anthropic API 설정 (시장 분석용, 선택적)
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_DEFAULT_MODEL: str = "claude-3-5-sonnet-20241022"

    # Google AI API 설정 (향후 지원)
    GOOGLE_AI_API_KEY: str = ""
    GOOGLE_DEFAULT_MODEL: str = "gemini-1.5-pro"

    # Azure OpenAI 설정 (향후 지원)
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_DEPLOYMENT: str = ""

    # LLM 파이프라인 설정
    LLM_PRIMARY_PROVIDER: str = "openai"  # openai, anthropic, google, azure_openai
    LLM_FALLBACK_ORDER: str = "openai,anthropic"  # 쉼표 구분 폴백 순서
    LLM_MAX_RETRIES: int = 3
    LLM_CIRCUIT_BREAKER_THRESHOLD: int = 3
    LLM_CIRCUIT_BREAKER_RECOVERY_MINUTES: int = 5

    # 시장 분석 설정
    ANALYSIS_INTERVAL_MINUTES: int = 5
    ANALYSIS_PROMPT_VERSION: str = "v1_basic"  # v1_basic, v2_detailed, v3_expert
    ANALYSIS_DEFAULT_SYMBOL: str = "BTCUSDT"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

