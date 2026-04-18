from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.sub_aftercare_controller import SubAftercareController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.sub_aftercare import SubAftercareOut, SubAftercareUpdate

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403_SUB = {"description": "Forbidden — caller does not have the sub role"}
_E403_GODDESS = {"description": "Forbidden — caller does not have the goddess role"}
_E404 = {"description": "Not found — sub does not exist or does not belong to this goddess"}

router = APIRouter(tags=["aftercare"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> SubAftercareController:
    return SubAftercareController(session)


@router.get(
    "/profile/aftercare",
    summary="Get own aftercare profile",
    description=(
        "Returns the calling sub's aftercare record. "
        "If the sub has never saved an aftercare profile, returns a default-empty document "
        "(all fields null, intensity 3) with `updated_at` set to the current time. "
        "This endpoint is restricted to the `sub` role."
    ),
    response_model=SubAftercareOut,
    status_code=200,
    tags=["aftercare"],
    responses={401: _E401, 403: _E403_SUB},
)
async def get_own_aftercare(
    sub: User = Depends(require_role(UserRole.sub)),
    ctrl: SubAftercareController = Depends(_ctrl),
) -> SubAftercareOut:
    """Retrieve the authenticated sub's aftercare profile."""
    return await ctrl.get_own(sub)


@router.put(
    "/profile/aftercare",
    summary="Save own aftercare profile",
    description=(
        "Creates or fully replaces the calling sub's aftercare record. "
        "All fields are optional — omit a field to leave it unchanged. "
        "Pass an explicit `null` to clear a text field. "
        "`intensity` must be between 1 (gentle) and 5 (intense); defaults to 3. "
        "Returns the updated aftercare document. "
        "This endpoint is restricted to the `sub` role."
    ),
    response_model=SubAftercareOut,
    status_code=200,
    tags=["aftercare"],
    responses={401: _E401, 403: _E403_SUB},
)
async def upsert_own_aftercare(
    body: SubAftercareUpdate,
    sub: User = Depends(require_role(UserRole.sub)),
    session: AsyncSession = Depends(get_session),
    ctrl: SubAftercareController = Depends(_ctrl),
) -> SubAftercareOut:
    """Create or update the authenticated sub's aftercare profile."""
    result = await ctrl.upsert_own(sub, body)
    await session.commit()
    return result


@router.get(
    "/goddess/subs/{username}/aftercare",
    summary="Get a sub's aftercare profile",
    description=(
        "Returns the aftercare profile for the given sub. "
        "Returns 404 if the sub does not exist or does not belong to this goddess. "
        "This endpoint is restricted to the `goddess` role."
    ),
    response_model=SubAftercareOut,
    status_code=200,
    tags=["aftercare"],
    responses={401: _E401, 403: _E403_GODDESS, 404: _E404},
)
async def get_sub_aftercare_for_goddess(
    username: str,
    goddess: User = Depends(require_role(UserRole.goddess)),
    ctrl: SubAftercareController = Depends(_ctrl),
) -> SubAftercareOut:
    """Return the sub's aftercare profile for the authenticated goddess."""
    return await ctrl.get_for_goddess(goddess, username)


@router.post(
    "/goddess/subs/{username}/aftercare/read",
    summary="Mark a sub's aftercare profile as read",
    description=(
        "Stamps `read_by_goddess_at` to the current UTC time on the given sub's aftercare profile. "
        "Idempotent — if the field is already set the earlier timestamp is preserved. "
        "Returns 404 if the sub does not exist or does not belong to this goddess "
        "(existence is not leaked). "
        "This endpoint is restricted to the `goddess` role."
    ),
    response_model=None,
    status_code=204,
    tags=["aftercare"],
    responses={401: _E401, 403: _E403_GODDESS, 404: _E404},
)
async def mark_aftercare_read(
    username: str,
    goddess: User = Depends(require_role(UserRole.goddess)),
    session: AsyncSession = Depends(get_session),
    ctrl: SubAftercareController = Depends(_ctrl),
) -> Response:
    """Mark the sub's aftercare profile as read by the goddess."""
    await ctrl.mark_read(goddess, username)
    await session.commit()
    return Response(status_code=204)
