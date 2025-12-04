"""
애플리케이션 설정
환경 변수 관리를 위해 Pydantic Settings 사용
"""
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

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

