import asyncio
import time
from dataclasses import dataclass
from typing import Protocol

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from core.config import get_settings

_settings = get_settings()


def _build_slowapi_limiter() -> Limiter:
    if _settings.rate_limiter_backend == "redis":
        if not _settings.redis_url:
            raise RuntimeError("RATE_LIMITER_BACKEND=redis requires REDIS_URL")
        return Limiter(
            key_func=get_remote_address,
            enabled=_settings.rate_limit_enabled,
            storage_uri=_settings.redis_url,
        )
    return Limiter(
        key_func=get_remote_address,
        enabled=_settings.rate_limit_enabled,
    )


limiter = _build_slowapi_limiter()


@dataclass(frozen=True, slots=True)
class RateLimitResult:
    allowed: bool
    remaining: int
    retry_after: int | None


class RateLimiter(Protocol):
    async def check(self, key: str, limit: int, window_seconds: int) -> RateLimitResult: ...


class MemoryRateLimiter:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._windows: dict[str, tuple[int, float]] = {}

    async def check(self, key: str, limit: int, window_seconds: int) -> RateLimitResult:
        now = time.monotonic()
        async with self._lock:
            count, window_start = self._windows.get(key, (0, now))
            if now - window_start >= window_seconds:
                count, window_start = 0, now
            if count >= limit:
                retry_after = int(window_seconds - (now - window_start)) + 1
                return RateLimitResult(allowed=False, remaining=0, retry_after=retry_after)
            count += 1
            self._windows[key] = (count, window_start)
            return RateLimitResult(allowed=True, remaining=limit - count, retry_after=None)


def _build_rate_limiter() -> RateLimiter:
    if _settings.rate_limiter_backend == "redis":
        if not _settings.redis_url:
            raise RuntimeError("RATE_LIMITER_BACKEND=redis requires REDIS_URL")
        return _make_redis_limiter(_settings.redis_url)
    return MemoryRateLimiter()


def _make_redis_limiter(redis_url: str) -> RateLimiter:
    try:
        import redis.asyncio as aioredis  # noqa: PLC0415
    except ImportError as exc:
        raise RuntimeError(
            "redis package is required for RATE_LIMITER_BACKEND=redis. Run: uv add redis"
        ) from exc
    return _RedisRateLimiter(aioredis.from_url(redis_url, decode_responses=False))


class _RedisRateLimiter:
    def __init__(self, client: object) -> None:
        self._client = client

    async def check(self, key: str, limit: int, window_seconds: int) -> RateLimitResult:
        pipe = self._client.pipeline()  # type: ignore[union-attr]
        await pipe.incr(key)
        await pipe.ttl(key)
        results: list[int] = await pipe.execute()
        count, ttl = results[0], results[1]
        if count == 1 or ttl == -1:
            await self._client.expire(key, window_seconds)  # type: ignore[union-attr]
            ttl = window_seconds
        remaining = max(limit - count, 0)
        if count > limit:
            return RateLimitResult(allowed=False, remaining=0, retry_after=max(ttl, 1))
        return RateLimitResult(allowed=True, remaining=remaining, retry_after=None)


rate_limiter: RateLimiter = _build_rate_limiter()


async def rate_limit_exceeded_handler(_: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "rate limit exceeded, try again later"},
    )
