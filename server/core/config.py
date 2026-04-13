from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    database_url: str
    jwt_secret_key: str
    jwt_access_ttl_minutes: int = 15
    jwt_refresh_ttl_days: int = 30
    argon2_memory_cost: int = 65536
    argon2_time_cost: int = 3
    argon2_parallelism: int = 4
    cors_origins: str = "http://localhost:5173"

    resend_api_key: str = ""
    resend_from_email: str = "noreply@debt-collector.local"

    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = ""
    r2_public_url: str = ""

    app_url: str = "http://localhost:5173"
    app_timezone: str = "Europe/London"

    admin_username: str = "admin"
    admin_email: str = "admin@debt-collector.local"
    admin_password: str = "change-me"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
