from uuid import UUID

from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import HTTPConnection

from core.db import get_session
from core.security import decode_access_token
from daos.user_dao import UserDao
from models.user import UserStatus

# (method, path) pairs always reachable regardless of sub access state.
# Matched against (request.method, request.url.path) — method-scoped to avoid
# leaking GET endpoints when only POST is intended (e.g. /sub/payments).
_PORCH_ALLOWLIST: frozenset[tuple[str, str]] = frozenset(
    {
        ("GET", "/auth/me"),
        ("POST", "/auth/login"),
        ("POST", "/auth/logout"),
        ("POST", "/auth/refresh"),
        ("POST", "/auth/password-reset/request"),
        ("POST", "/auth/password-reset/confirm"),
        # POST /sub/payments is allowlisted (declare entry tribute); the payment
        # controller enforces PaymentCategory.entry. GET /sub/payments (history)
        # remains blocked so a porch sub cannot read other declarations.
        ("POST", "/sub/payments"),
        ("GET", "/health"),
    }
)

_403_HEADERS = {"X-Access-State": "pending_entry_tribute"}


async def porch_gate(
    conn: HTTPConnection,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Block pending-entry-tribute subs from all routes outside the porch allowlist.

    Returns immediately (no-op) when:
    - The request path is on the allowlist.
    - The request carries no Bearer token (unauthenticated requests fail later via normal auth).
    - The token is malformed or expired (normal auth will reject it anyway).
    - The resolved user is not pending_entry_tribute.

    Raises HTTP 403 with header ``X-Access-State: pending_entry_tribute`` otherwise.
    WebSocket scopes short-circuit — WS endpoints authenticate via ?token=... and
    enforce access state themselves.
    """
    if conn.scope.get("type") != "http":
        return

    if (conn.scope["method"], conn.url.path) in _PORCH_ALLOWLIST:
        return

    authorization = conn.headers.get("Authorization") or conn.headers.get("authorization")
    if not authorization or not authorization.lower().startswith("bearer "):
        return

    raw_token = authorization.split(" ", 1)[1]
    try:
        payload = decode_access_token(raw_token)
    except Exception:
        return

    if payload.get("imp"):
        return

    user_id_str = payload.get("sub")
    if not user_id_str:
        return

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        return

    user = await UserDao(session).get_by_id(user_id)
    if user is None or user.status != UserStatus.pending_entry_tribute:
        return

    raise HTTPException(
        status_code=403,
        detail={
            "error": "Forbidden",
            "message": "account is pending entry tribute — only porch endpoints are accessible",
            "access_state": "pending_entry_tribute",
        },
        headers=_403_HEADERS,
    )
