from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.merits_controller import MeritsController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.merits import PointsBalanceOut

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch"}
_E404 = {"description": "Not found — sub does not exist or is not under this goddess"}

router = APIRouter(tags=["merits"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> MeritsController:
    return MeritsController(session)


@router.get(
    "/sub/points-balance",
    summary="Get own points balance",
    description=(
        "Returns the authenticated sub's merit points balance scoped to their assigned goddess. "
        "Balance is computed as SUM(delta) over all merit events for this sub+goddess pair. "
        "Returns 403 if the sub has no assigned goddess."
    ),
    response_model=PointsBalanceOut,
    status_code=200,
    tags=["merits"],
    responses={
        401: _E401,
        403: _E403,
    },
)
async def get_own_points_balance(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: MeritsController = Depends(_ctrl),
) -> PointsBalanceOut:
    return await ctrl.get_balance_for_sub_self(user)


@router.get(
    "/goddess/subs/{sub_id}/points-balance",
    summary="Get a sub's points balance",
    description=(
        "Returns the merit points balance for the given sub, scoped to the authenticated goddess. "
        "Only subs belonging to the caller's goddess profile are accessible. "
        "Balance is computed as SUM(delta) over all merit events for this sub+goddess pair."
    ),
    response_model=PointsBalanceOut,
    status_code=200,
    tags=["merits"],
    responses={
        401: _E401,
        403: _E403,
        404: _E404,
    },
)
async def get_sub_points_balance(
    sub_id: UUID,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: MeritsController = Depends(_ctrl),
) -> PointsBalanceOut:
    return await ctrl.get_balance_for_goddess_scoped(user, sub_id)
