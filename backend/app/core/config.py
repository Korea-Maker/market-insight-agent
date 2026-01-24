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

    # Multi-symbol settings
    DEFAULT_SYMBOLS: List[str] = ["BTCUSDT", "ETHUSDT", "BNBUSDT"]
    MAX_SYMBOLS_PER_CLIENT: int = 20
    MAX_TOTAL_SYMBOLS: int = 50
    SYMBOL_HISTORY_LIMIT: int = 1000
    REDIS_CHANNEL_PREFIX: str = "prices"

    # Binance settings
    BINANCE_WS_BASE: str = "wss://stream.binance.com:9443"
    BINANCE_STREAM_TYPE: str = "trade"

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

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

