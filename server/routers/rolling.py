from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.rolling_controller import RollingController
from core.db import get_session
from decorators.audit import audit
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.rolling import RollingTributeIn, RollingTributeOut

router = APIRouter(prefix="/goddess/subs/{sub_id}/rolling", tags=["rolling"])

_ERROR_401 = {"description": "Unauthorized — missing or invalid access token"}
_ERROR_403 = {"description": "Forbidden — caller is not a goddess or has no goddess profile"}
_ERROR_404 = {"description": "Not found — sub does not exist or is not linked to this goddess"}
_ERROR_422 = {"description": "Unprocessable entity — request body validation failed"}
_ERROR_500 = {"description": "Internal server error"}


def _build_controller(session: AsyncSession = Depends(get_session)) -> RollingController:
    return RollingController(session)


@router.get(
    "/",
    summary="Get rolling tribute for a sub",
    description=(
        "Returns the rolling tribute configuration for the given sub. "
        "Includes computed fields: `current_cycle_deadline`, `amount_due`, and `days_late`. "
        "Returns `null` if no rolling tribute has been configured yet."
    ),
    response_model=RollingTributeOut | None,
    status_code=200,
    tags=["rolling"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        500: _ERROR_500,
    },
)
async def get_rolling_tribute(
    sub_id: UUID,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: RollingController = Depends(_build_controller),
) -> RollingTributeOut | None:
    return await ctrl.get_for_sub_by_goddess(user, sub_id)


@router.put(
    "/",
    summary="Upsert rolling tribute for a sub",
    description=(
        "Creates or replaces the rolling tribute configuration for the given sub. "
        "If a record already exists it is updated in place. "
        "Returns the full record with computed deadline and amount fields."
    ),
    response_model=RollingTributeOut,
    status_code=200,
    tags=["rolling"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
@audit(kind="rolling_upserted", entity="rolling_tribute")
async def upsert_rolling_tribute(
    sub_id: UUID,
    body: RollingTributeIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: RollingController = Depends(_build_controller),
) -> RollingTributeOut:
    result = await ctrl.upsert_for_sub(user, sub_id, body)
    await session.commit()
    return result


@router.delete(
    "/",
    summary="Clear rolling tribute for a sub",
    description=(
        "Disables the rolling tribute by setting `amount=0` and `paused=true`. "
        "The record is retained for audit purposes — it is not deleted. "
        "Raises 404 if no rolling tribute has been configured for this sub."
    ),
    response_model=None,
    status_code=204,
    tags=["rolling"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        500: _ERROR_500,
    },
)
@audit(kind="rolling_cleared", entity="rolling_tribute")
async def clear_rolling_tribute(
    sub_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: RollingController = Depends(_build_controller),
) -> None:
    await ctrl.clear_for_sub(user, sub_id)
    await session.commit()
