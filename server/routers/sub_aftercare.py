from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.sub_aftercare_controller import SubAftercareController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.sub_aftercare import SubAftercareOut, SubAftercareUpdate

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — caller does not have the sub role"}

router = APIRouter(prefix="/profile", tags=["aftercare"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> SubAftercareController:
    return SubAftercareController(session)


@router.get(
    "/aftercare",
    summary="Get own aftercare profile",
    description=(
        "Returns the calling sub's aftercare record. "
        "If the sub has never saved an aftercare profile, returns a default-empty document "
        "(all fields null) with `updated_at` set to the current time. "
        "This endpoint is restricted to the `sub` role."
    ),
    response_model=SubAftercareOut,
    status_code=200,
    tags=["aftercare"],
    responses={401: _E401, 403: _E403},
)
async def get_own_aftercare(
    sub: User = Depends(require_role(UserRole.sub)),
    session: AsyncSession = Depends(get_session),
) -> SubAftercareOut:
    """Retrieve the authenticated sub's aftercare profile."""
    ctrl = SubAftercareController(session)
    return await ctrl.get_own(sub)


@router.put(
    "/aftercare",
    summary="Save own aftercare profile",
    description=(
        "Creates or fully replaces the calling sub's aftercare record. "
        "All fields are optional — omit a field to leave it unchanged. "
        "Pass an explicit `null` to clear a field. "
        "Returns the updated aftercare document. "
        "This endpoint is restricted to the `sub` role."
    ),
    response_model=SubAftercareOut,
    status_code=200,
    tags=["aftercare"],
    responses={401: _E401, 403: _E403},
)
async def upsert_own_aftercare(
    body: SubAftercareUpdate,
    sub: User = Depends(require_role(UserRole.sub)),
    session: AsyncSession = Depends(get_session),
) -> SubAftercareOut:
    """Create or update the authenticated sub's aftercare profile."""
    ctrl = SubAftercareController(session)
    result = await ctrl.upsert_own(sub, body)
    await session.commit()
    return result
