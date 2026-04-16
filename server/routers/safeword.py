from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.sub_safeword_controller import SubSafewordController
from core.db import get_session
from core.exceptions import NotFound
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.safeword import SubSafewordIn, SubSafewordOut

_ERROR_401 = {"description": "Unauthorized — missing or invalid access token"}
_ERROR_403 = {"description": "Forbidden — caller lacks the required role or the sub is not theirs"}
_ERROR_404 = {"description": "Not found — no safeword record exists for this sub"}
_ERROR_422 = {"description": "Unprocessable entity — request body validation failed"}
_ERROR_500 = {"description": "Internal server error"}

router = APIRouter(tags=["safeword"])


def _build_controller(session: AsyncSession = Depends(get_session)) -> SubSafewordController:
    return SubSafewordController(session)


@router.post(
    "/sub/profile/safeword",
    summary="Upsert own safeword",
    description=(
        "Creates or replaces the authenticated sub's safeword record. "
        "The goddess assignment is resolved server-side from the sub's profile; "
        "the client must never supply a goddess identifier. "
        "Returns the current record after the write."
    ),
    response_model=SubSafewordOut,
    status_code=200,
    tags=["safeword"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def upsert_own_safeword(
    body: SubSafewordIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: SubSafewordController = Depends(_build_controller),
) -> SubSafewordOut:
    result = await ctrl.upsert_self(user.id, body)
    await session.commit()
    return result


@router.get(
    "/sub/profile/safeword",
    summary="Get own safeword",
    description=(
        "Returns the authenticated sub's safeword record. "
        "Responds with 404 if the sub has not yet set a safeword."
    ),
    response_model=SubSafewordOut,
    status_code=200,
    tags=["safeword"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        500: _ERROR_500,
    },
)
async def get_own_safeword(
    response: Response,
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: SubSafewordController = Depends(_build_controller),
) -> SubSafewordOut:
    record = await ctrl.get_self(user.id)
    if record is None:
        raise NotFound("safeword not set")
    return record


@router.get(
    "/goddess/subs/{sub_id}/safeword",
    summary="Get a sub's safeword",
    description=(
        "Returns the safeword record for the given sub. "
        "The sub must belong to the authenticated goddess; "
        "requests for subs under a different goddess are rejected with 403. "
        "Responds with 404 if the sub has not yet set a safeword."
    ),
    response_model=SubSafewordOut,
    status_code=200,
    tags=["safeword"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        500: _ERROR_500,
    },
)
async def get_sub_safeword_for_goddess(
    sub_id: UUID,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: SubSafewordController = Depends(_build_controller),
) -> SubSafewordOut:
    record = await ctrl.get_for_goddess(user.id, sub_id)
    if record is None:
        raise NotFound("safeword not set")
    return record
