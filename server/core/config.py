from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_minutes: int = 15
    jwt_refresh_ttl_days: int = 30
    password_reset_ttl_minutes: int = 30
    argon2_memory_cost: int = 65536
    argon2_time_cost: int = 3
    argon2_parallelism: int = 4
    cors_origins: str = "http://localhost:5173"

    email_driver: str = "smtp"
    mail_from: str = "Goddess Mean Mal <no-reply@localhost>"
    resend_api_key: str = ""
    resend_from_email: str = "noreply@debt-collector.local"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    public_base_url: str = "http://localhost:5173"

    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = ""
    r2_public_url: str = ""

    app_url: str = "http://localhost:5173"
    app_timezone: str = "Europe/London"
    cron_enabled: bool = True

    admin_username: str = "admin"
    admin_email: str = "admin@localhost"
    admin_password: str = "ChangeMe!Dev123"

    goddess_email: str = "goddess@localhost"
    goddess_password: str = "ChangeMe!Dev123"
    goddess_display_name: str = "Mean Mal"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
