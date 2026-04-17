"""Audit decorator — wraps goddess + admin mutation route handlers.

Writes an `admin_action` row after a successful (2xx) handler invocation using the
same `AsyncSession` the handler used. No row is written if the handler raises —
failed actions are not audited.

The decorator inspects the wrapped handler's kwargs for:
- `user`, `goddess`, `admin`, or `caller` — the acting `User` (drives `admin_id`).
- `session` — the `AsyncSession` (same transaction as the handler's writes).
- Any other `UUID` path-param kwargs — copied into the audit payload.
- `BaseModel` kwargs are dumped via `.model_dump(mode="json")` and merged under
  the kwarg's name; sensitive keys (`password`, `password_hash`, `signature_b64`)
  are redacted recursively through the dumped dict.

Decorator usage:

    @audit(kind="invitation_created", entity="invitation")
    async def create_invitation(...): ...

The `entity_id` is derived from the returned model's `.id` attribute when present.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from datetime import datetime
from functools import wraps
from typing import Any, ParamSpec, TypeVar
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from daos.admin_action_dao import AdminActionDao
from models.user import User

_P = ParamSpec("_P")
_R = TypeVar("_R")

_ACTOR_KWARGS = ("user", "goddess", "admin", "caller", "actor")
_SESSION_KWARGS = ("session",)
_REDACTED_KEYS: frozenset[str] = frozenset({"password", "password_hash", "signature_b64"})

_log = logging.getLogger(__name__)


def _pick_actor(kwargs: dict[str, Any]) -> User | None:
    for key in _ACTOR_KWARGS:
        value = kwargs.get(key)
        if isinstance(value, User):
            return value
    return None


def _pick_session(kwargs: dict[str, Any]) -> AsyncSession | None:
    for key in _SESSION_KWARGS:
        value = kwargs.get(key)
        if isinstance(value, AsyncSession):
            return value
    return None


def _extract_entity_id(result: Any) -> UUID | None:
    candidate = getattr(result, "id", None)
    if isinstance(candidate, UUID):
        return candidate
    if isinstance(candidate, str):
        try:
            return UUID(candidate)
        except ValueError:
            return None
    return None


def _redact(value: Any, keys: frozenset[str]) -> Any:
    if isinstance(value, dict):
        return {k: ("***" if k in keys else _redact(v, keys)) for k, v in value.items()}
    if isinstance(value, list):
        return [_redact(item, keys) for item in value]
    return value


def _build_payload(kwargs: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in kwargs.items():
        if key in _ACTOR_KWARGS or key in _SESSION_KWARGS or key.startswith("_"):
            continue
        if key in ("ctrl", "response", "request"):
            continue
        if key in _REDACTED_KEYS:
            continue
        if isinstance(value, BaseModel):
            dumped = value.model_dump(mode="json")
            out[key] = _redact(dumped, _REDACTED_KEYS)
        elif isinstance(value, UUID):
            out[key] = str(value)
        elif isinstance(value, datetime):
            out[key] = value.isoformat()
        elif isinstance(value, str | int | float | bool) or value is None:
            out[key] = value
    return out


def audit(
    kind: str, *, entity: str | None = None
) -> Callable[[Callable[_P, Awaitable[_R]]], Callable[_P, Awaitable[_R]]]:
    """Wrap a FastAPI route handler so a successful call emits an AdminAction row.

    The decorator preserves the wrapped function's signature so FastAPI still sees
    the correct dependency-injection metadata.
    """

    def decorate(func: Callable[_P, Awaitable[_R]]) -> Callable[_P, Awaitable[_R]]:
        @wraps(func)
        async def wrapper(*args: _P.args, **kwargs: _P.kwargs) -> _R:
            result = await func(*args, **kwargs)
            actor = _pick_actor(kwargs)
            session = _pick_session(kwargs)
            if actor is None:
                _log.warning(
                    "audit decorator could not resolve %s for route %s kind=%s",
                    "actor",
                    func.__qualname__,
                    kind,
                )
            if session is None:
                _log.warning(
                    "audit decorator could not resolve %s for route %s kind=%s",
                    "session",
                    func.__qualname__,
                    kind,
                )
            if actor is not None and session is not None:
                entity_id = _extract_entity_id(result)
                payload = _build_payload(kwargs)
                await AdminActionDao(session).record(
                    admin_id=actor.id,
                    action=kind,
                    entity=entity,
                    entity_id=entity_id,
                    payload=payload or None,
                )
                await session.commit()
            return result

        return wrapper

    return decorate
