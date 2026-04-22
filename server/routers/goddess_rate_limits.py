"""Read-only rate-limit counters for the calling goddess.

Powers inline warnings in the UI (e.g. "You've already rejected 5 payments today —
sure?"). The counters are derived on the fly from ``admin_action`` history so the
server stays the single source of truth and we never cache counts client-side.
"""

from __future__ import annotations

import datetime as dt
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
    payment_rejections_threshold: int = Field(
        ...,
        description=(
            "Soft advisory threshold — when reached, UI surfaces a banner to slow the "
            "goddess down. Configurable via `GODDESS_REJECT_THRESHOLD_PER_DAY` env var."
        ),
        examples=[5],
    )


def _today_start_utc() -> dt.datetime:
    today_local = dt.datetime.now(_LONDON).date()
    start_local = dt.datetime.combine(today_local, dt.time.min, tzinfo=_LONDON)
    return start_local.astimezone(dt.UTC).replace(tzinfo=None)


@router.get(
    "/rate-limits",
    summary="Daily rate-limit counters for the calling goddess",
    description=(
        "Returns counters the UI uses to surface soft warnings (e.g. an inline banner "
        "above the `RejectModal` textarea when the goddess has already rejected many "
        "payments today). Counters reset at midnight Europe/London, derived from "
        "`admin_action` rows so there's no caching layer to invalidate. Goddess only."
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
    result = await session.execute(
        select(func.count())
        .select_from(AdminAction)
        .where(
            col(AdminAction.admin_id) == user.id,
            col(AdminAction.action) == "payment_rejected",
            col(AdminAction.created_at) >= start_utc,
        )
    )
    count = int(result.scalar_one() or 0)
    return GoddessRateLimitsOut(
        payment_rejections_today=count,
        payment_rejections_threshold=settings.goddess_reject_threshold_per_day,
    )
