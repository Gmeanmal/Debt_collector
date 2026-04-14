from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.goddess_views_controller import GoddessViewsController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.goddess_views import LateSubItem, WeeklyPaymentBucket

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — caller is not a goddess"}
_E500 = {"description": "Internal server error"}

router = APIRouter(prefix="/goddess", tags=["goddess-views"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> GoddessViewsController:
    return GoddessViewsController(session)


@router.get(
    "/payments/weekly",
    summary="Fetch weekly payment aggregates",
    description=(
        "Returns 8 ISO week buckets (current week plus 7 previous) for the calling goddess. "
        "Each bucket contains the total validated payment amount and count of declarations "
        "validated in that Europe/London week (Monday–Sunday). "
        "Weeks are ordered newest first. Only `validated` declarations are counted."
    ),
    response_model=list[WeeklyPaymentBucket],
    status_code=200,
    tags=["goddess-views"],
    responses={401: _E401, 403: _E403, 500: _E500},
)
async def weekly_payments(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: GoddessViewsController = Depends(_ctrl),
) -> list[WeeklyPaymentBucket]:
    return await ctrl.weekly_payments(user)


@router.get(
    "/subs/late",
    summary="List subs currently late on their rolling tribute",
    description=(
        "Returns all active subs under this goddess whose rolling tribute is currently late — "
        "i.e. the last cycle deadline has passed without a validated payment. "
        "Includes days late, the overdue amount (with any late penalty applied), and "
        "the datetime of the last validated payment if one exists. "
        "Sorted by days_late descending."
    ),
    response_model=list[LateSubItem],
    status_code=200,
    tags=["goddess-views"],
    responses={401: _E401, 403: _E403, 500: _E500},
)
async def late_subs(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: GoddessViewsController = Depends(_ctrl),
) -> list[LateSubItem]:
    return await ctrl.late_subs(user)
