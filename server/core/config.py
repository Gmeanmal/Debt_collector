from enum import StrEnum
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppEnv(StrEnum):
    dev = "dev"
    test = "test"
    staging = "staging"
    prod = "prod"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    app_env: AppEnv = AppEnv.dev

    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_minutes: int = 15
    jwt_refresh_ttl_days: int = 30
    password_reset_ttl_minutes: int = 60
    impersonation_ttl_minutes: int = 30
    refresh_cookie_name: str = "debt_refresh"
    refresh_cookie_domain: str = ""
    argon2_memory_cost: int = 65536
    argon2_time_cost: int = 3
    argon2_parallelism: int = 4
    cors_origins: str = "http://localhost:4010"
    cors_origin_regex: str = ""
    refresh_cookie_samesite_override: Literal["", "lax", "strict", "none"] = ""
    refresh_cookie_secure_override: Literal["", "true", "false"] = ""

    email_driver: str = "smtp"
    mail_from: str = "Goddess Mean Mal <no-reply@localhost>"
    resend_api_key: str = ""
    resend_from_email: str = "noreply@debt-collector.local"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    public_base_url: str = "http://localhost:4010"

    app_url: str = "http://localhost:4010"
    app_timezone: str = "Europe/London"
    cron_enabled: bool = True

    rate_limit_enabled: bool = True
    rate_limit_login: str = "10/minute"
    rate_limit_signup: str = "5/minute"
    rate_limit_password_reset: str = "3/minute"
    rate_limit_public_invitation: str = "30/minute"
    rate_limiter_backend: Literal["memory", "redis"] = "memory"
    redis_url: str = ""

    # Defense-in-depth: HMAC key applied before argon2. Empty string disables pepper.
    # Must differ from JWT_SECRET_KEY and be rotated independently.
    password_pepper: str = ""

    r2_endpoint: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_sub_photos: str = ""
    r2_bucket_toys: str = ""
    r2_bucket_vault: str = ""
    r2_presign_ttl_seconds: int = 600

    root_kek_b64: str = ""
    root_kek_version: int = 1

    @property
    def is_prod(self) -> bool:
        return self.app_env == AppEnv.prod

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def refresh_cookie_secure(self) -> bool:
        if self.refresh_cookie_secure_override:
            return self.refresh_cookie_secure_override == "true"
        return self.is_prod

    @property
    def refresh_cookie_samesite(self) -> str:
        if self.refresh_cookie_samesite_override:
            return self.refresh_cookie_samesite_override
        return "strict" if self.is_prod else "lax"

    @property
    def security_hsts_enabled(self) -> bool:
        return self.is_prod


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
