"""
Integration test fixtures.

Default: spawns a Postgres 16 container via testcontainers.
Fallback: if DATABASE_URL env var is already set with +asyncpg, uses it directly.
"""

import os
import subprocess
from collections.abc import AsyncGenerator, Generator
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from testcontainers.postgres import PostgresContainer

# ---------------------------------------------------------------------------
# Session-scoped Postgres container / URL
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def pg_url() -> Generator[str, None, None]:
    """Yield an asyncpg DATABASE_URL from a container (or env override)."""
    existing = os.environ.get("DATABASE_URL")
    if existing and "+asyncpg" in existing:
        yield existing
        return

    with PostgresContainer("postgres:16-alpine") as pg:
        sync_url: str = pg.get_connection_url()
        async_url = sync_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
        yield async_url


@pytest.fixture(scope="session", autouse=True)
def run_migrations(pg_url: str) -> None:
    """Run alembic upgrade head against the test DB once per session."""
    server_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    env = {**os.environ, "DATABASE_URL": pg_url}
    result = subprocess.run(
        ["uv", "run", "alembic", "upgrade", "head"],
        cwd=server_dir,
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"alembic upgrade failed:\n{result.stderr}\n{result.stdout}")


# ---------------------------------------------------------------------------
# Direct DB session for seeding (commits so the app's sessions can see data)
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def db_session(pg_url: str) -> AsyncGenerator[AsyncSession, None]:
    """
    Function-scoped async session backed by its own engine.
    Helpers call session.commit() so data is visible to the ASGI app.
    """
    engine = create_async_engine(pg_url, pool_pre_ping=True)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with factory() as session:
        yield session
    await engine.dispose()


# ---------------------------------------------------------------------------
# HTTP client — rate limiting disabled by default
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def client(pg_url: str) -> AsyncGenerator[AsyncClient, None]:
    """
    ASGI test client wired to the FastAPI app.

    * Points at the test DB via DATABASE_URL.
    * Rate limiting disabled so tests don't interfere with each other.
    * Email service stubbed to a no-op.
    """
    patch_env(pg_url, rate_limit_enabled="false")

    from core.config import get_settings

    get_settings.cache_clear()

    import core.db as _db

    new_engine = create_async_engine(pg_url, pool_pre_ping=True)
    _db.engine = new_engine
    _db.SessionMaker = async_sessionmaker(new_engine, expire_on_commit=False, class_=AsyncSession)

    # Disable the module-level limiter so rate limit storage doesn't fill up during
    # unrelated tests (the `@limiter.limit(...)` decorator still fires even without
    # SlowAPIMiddleware; disabling stops the counter from accumulating).
    from core.rate_limit import limiter as _limiter

    _limiter.enabled = False

    email_stub = AsyncMock()
    with patch("services.email.factory.get_email_service", return_value=email_stub):
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac

    _limiter.enabled = True  # restore for rate-limit-specific tests
    await new_engine.dispose()


@pytest_asyncio.fixture
async def client_with_ratelimit(pg_url: str) -> AsyncGenerator[AsyncClient, None]:
    """Same as `client` but with rate limiting ENABLED (for rate-limit tests)."""
    patch_env(pg_url, rate_limit_enabled="true")

    from core.config import get_settings

    get_settings.cache_clear()

    import core.db as _db

    new_engine = create_async_engine(pg_url, pool_pre_ping=True)
    _db.engine = new_engine
    _db.SessionMaker = async_sessionmaker(new_engine, expire_on_commit=False, class_=AsyncSession)

    email_stub = AsyncMock()
    with patch("services.email.factory.get_email_service", return_value=email_stub):
        # Reimport app fresh so limiter picks up the enabled setting
        import importlib

        import main as _main_module

        importlib.reload(_main_module)
        app = _main_module.app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac

    await new_engine.dispose()


def patch_env(pg_url: str, rate_limit_enabled: str = "false") -> None:
    os.environ["DATABASE_URL"] = pg_url
    os.environ.setdefault("APP_ENV", "test")
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret-not-for-prod-int")
    os.environ["CRON_ENABLED"] = "false"
    os.environ["RATE_LIMIT_ENABLED"] = rate_limit_enabled
    os.environ.setdefault("EMAIL_DRIVER", "smtp")
