"""Read-only rate-limit counters for the calling goddess.

Powers inline warnings in the UI (e.g. "You've already rejected 5 payments today —
sure?"). The counters are derived on the fly from ``admin_action`` history so the
server stays the single source of truth and we never cache counts client-side.
"""

from __future__ import annotations

import datetime as dt
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.config import get_settings
from core.db import get_session
from dependencies.auth import require_role
from models.admin_action import AdminAction
from models.user import User, UserRole

_LONDON = ZoneInfo("Europe/London")

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — caller is not a goddess"}

_TRACKED_ACTIONS = ("payment_rejected", "photo_rejected", "profile_change_rejected")

router = APIRouter(prefix="/goddess/me", tags=["goddess-rate-limits"])


class GoddessRateLimitsOut(BaseModel):
    payment_rejections_today: int = Field(
        ...,
        description=(
            "Number of `payment_rejected` audit entries authored by this goddess since "
            "midnight Europe/London."
        ),
        examples=[3],
    )
    photo_rejections_today: int = Field(
        ...,
        description=(
            "Number of `photo_rejected` audit entries authored by this goddess since "
            "midnight Europe/London."
        ),
        examples=[1],
    )
    profile_change_rejections_today: int = Field(
        ...,
        description=(
            "Number of `profile_change_rejected` audit entries authored by this goddess "
            "since midnight Europe/London."
        ),
        examples=[0],
    )
    review_queue_reject_calls_today: int = Field(
        ...,
        description=(
            "Number of review-queue bulk calls with `action=reject` authored by this "
            "goddess since midnight Europe/London. Extracted from "
            "`admin_action.payload_json->'body'->>'action'`."
        ),
        examples=[2],
    )
    rejections_threshold: int = Field(
        ...,
        description=(
            "Soft advisory threshold — when any kind-specific counter reaches it, UI "
            "surfaces a banner to slow the goddess down. Shared across all reject kinds. "
            "Configurable via `GODDESS_REJECT_THRESHOLD_PER_DAY` env var."
        ),
        examples=[5],
    )


def _today_start_utc() -> dt.datetime:
    today_local = dt.datetime.now(_LONDON).date()
    start_local = dt.datetime.combine(today_local, dt.time.min, tzinfo=_LONDON)
    return start_local.astimezone(dt.UTC).replace(tzinfo=None)


async def _count_per_action(
    session: AsyncSession, admin_id: UUID, start_utc: dt.datetime
) -> dict[str, int]:
    """Return ``{action: count}`` grouped in a single query."""
    result = await session.execute(
        select(AdminAction.action, func.count())
        .where(
            col(AdminAction.admin_id) == admin_id,
            col(AdminAction.action).in_(_TRACKED_ACTIONS),
            col(AdminAction.created_at) >= start_utc,
        )
        .group_by(col(AdminAction.action))
    )
    return {action: int(count) for action, count in result.all()}


async def _count_review_queue_rejects(
    session: AsyncSession, admin_id: UUID, start_utc: dt.datetime
) -> int:
    """Count review-queue bulk calls where the submitted body had ``action=reject``."""
    body_action = AdminAction.payload_json["body"]["action"].astext  # type: ignore[index]
    result = await session.execute(
        select(func.count()).where(
            col(AdminAction.admin_id) == admin_id,
            col(AdminAction.action) == "review_queue_bulk_action",
            body_action == "reject",
            col(AdminAction.created_at) >= start_utc,
        )
    )
    return int(result.scalar_one() or 0)


@router.get(
    "/rate-limits",
    summary="Daily rate-limit counters for the calling goddess",
    description=(
        "Returns counters the UI uses to surface soft warnings (e.g. an inline banner "
        "above the `RejectModal` textarea when the goddess has already rejected many "
        "items today). Counters cover `payment_rejected`, `photo_rejected`, "
        "`profile_change_rejected`, and the reject-flavoured `review_queue_bulk_action` "
        "audit kinds; they reset at midnight Europe/London and are derived from "
        "`admin_action` rows — no caching layer. Goddess only."
    ),
    response_model=GoddessRateLimitsOut,
    status_code=200,
    tags=["goddess-rate-limits"],
    responses={401: _E401, 403: _E403},
)
async def get_rate_limits(
    user: User = Depends(require_role(UserRole.goddess)),
    session: AsyncSession = Depends(get_session),
) -> GoddessRateLimitsOut:
    settings = get_settings()
    start_utc = _today_start_utc()
    counts = await _count_per_action(session, user.id, start_utc)
    rq_rejects = await _count_review_queue_rejects(session, user.id, start_utc)
    return GoddessRateLimitsOut(
        payment_rejections_today=counts.get("payment_rejected", 0),
        photo_rejections_today=counts.get("photo_rejected", 0),
        profile_change_rejections_today=counts.get("profile_change_rejected", 0),
        review_queue_reject_calls_today=rq_rejects,
        rejections_threshold=settings.goddess_reject_threshold_per_day,
    )
