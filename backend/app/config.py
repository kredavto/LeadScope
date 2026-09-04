import secrets
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    app_name: str = "LeadScope"
    app_env: str = "development"
    secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    field_encryption_key: str | None = None
    database_url: str = "sqlite:///./leadscope.db"
    redis_url: str = "redis://localhost:6379/0"
    api_cors_origins: str = "http://localhost:3000"
    crawler_user_agent: str = "LeadScopeBot/1.0 (+mailto:compliance@example.com)"
    crawler_contact_email: str = "compliance@example.com"
    webhook_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    suppression_pepper: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    max_response_bytes: int = 2_000_000
    max_redirects: int = 4
    allowed_content_types: tuple[str, ...] = ("text/html", "application/xhtml+xml")

    @field_validator("secret_key")
    @classmethod
    def validate_secret(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("SECRET_KEY must contain at least 32 characters")
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.api_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
