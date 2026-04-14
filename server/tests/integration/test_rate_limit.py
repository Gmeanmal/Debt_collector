"""Integration smoke test: rate limiting on /auth/login."""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from tests.integration.conftest import patch_env


@pytest_asyncio.fixture
async def rate_limit_client(pg_url: str) -> AsyncGenerator[AsyncClient, None]:
    """
    ASGI client with SlowAPI middleware active and fresh in-memory counter.
    """
    patch_env(pg_url, rate_limit_enabled="true")

    from core.config import get_settings

    get_settings.cache_clear()

    import core.db as _db

    new_engine = create_async_engine(pg_url, pool_pre_ping=True)
    _db.engine = new_engine
    _db.SessionMaker = async_sessionmaker(new_engine, expire_on_commit=False, class_=AsyncSession)

    # Reset the in-memory hit counter before this test
    from core.rate_limit import limiter

    limiter._storage.reset()  # type: ignore[attr-defined]

    email_stub = AsyncMock()
    with patch("services.email.factory.get_email_service", return_value=email_stub):
        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware
        from slowapi.errors import RateLimitExceeded
        from slowapi.middleware import SlowAPIMiddleware

        from core.exception_handlers import register as register_exception_handlers
        from core.rate_limit import rate_limit_exceeded_handler
        from middleware.security_headers import SecurityHeadersMiddleware
        from routers import auth

        app = FastAPI(title="Test Rate Limit App")
        app.state.limiter = limiter
        app.add_middleware(SlowAPIMiddleware)
        app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)  # type: ignore[arg-type]
        app.add_middleware(SecurityHeadersMiddleware, enable_hsts=False)
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:5173"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        register_exception_handlers(app)
        app.include_router(auth.router)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac

    await new_engine.dispose()


@pytest.mark.asyncio
async def test_login_rate_limit(rate_limit_client: AsyncClient) -> None:
    """
    The default rate limit for login is 10/minute.
    Hammer it with 15 attempts from the same IP and expect at least one 429.
    """
    got_429 = False
    for _ in range(15):
        resp = await rate_limit_client.post(
            "/auth/login",
            json={"email": "ratelimit@test.local", "password": "wrong"},
        )
        if resp.status_code == 429:
            got_429 = True
            break

    assert got_429, "Expected a 429 after exceeding the login rate limit"
