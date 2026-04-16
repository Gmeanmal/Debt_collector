from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.limits_controller import LimitsController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.limits import (
    SubLimitCreate,
    SubLimitOut,
    SubLimitUpdate,
    SubTriggerCreate,
    SubTriggerOut,
    SubTriggerUpdate,
)

_ERROR_401 = {"description": "Unauthorized — missing or invalid access token"}
_ERROR_403 = {
    "description": "Forbidden — caller lacks the required role or the target sub is not theirs"
}
_ERROR_404 = {
    "description": "Not found — target resource does not exist or is not owned by the caller"
}
_ERROR_422 = {"description": "Unprocessable entity — request body validation failed"}
_ERROR_500 = {"description": "Internal server error"}

router = APIRouter()


def _build_controller(session: AsyncSession = Depends(get_session)) -> LimitsController:
    return LimitsController(session)


@router.get(
    "/sub/profile/limits",
    summary="List own limits",
    description=(
        "Returns every hard and soft limit owned by the authenticated sub, newest first. "
        "Each row exposes the current acknowledgement status set by the assigned goddess."
    ),
    response_model=list[SubLimitOut],
    status_code=status.HTTP_200_OK,
    tags=["limits"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        500: _ERROR_500,
    },
)
async def list_own_limits(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: LimitsController = Depends(_build_controller),
) -> list[SubLimitOut]:
    return await ctrl.list_own_limits(user.id)


@router.post(
    "/sub/profile/limits",
    summary="Create a limit",
    description=(
        "Creates a new limit for the authenticated sub. "
        "The goddess link is resolved server-side from the sub's profile. "
        "`acknowledged_by_goddess_at` is always null on creation so the "
        "goddess is forced to review it."
    ),
    response_model=SubLimitOut,
    status_code=status.HTTP_201_CREATED,
    tags=["limits"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def create_own_limit(
    body: SubLimitCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: LimitsController = Depends(_build_controller),
) -> SubLimitOut:
    result = await ctrl.create_own_limit(user.id, body)
    await session.commit()
    return result


@router.patch(
    "/sub/profile/limits/{limit_id}",
    summary="Edit a limit",
    description=(
        "Partially updates a limit owned by the authenticated sub. "
        "Any edit clears `acknowledged_by_goddess_at` so the goddess must "
        "acknowledge the new wording."
    ),
    response_model=SubLimitOut,
    status_code=status.HTTP_200_OK,
    tags=["limits"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def update_own_limit(
    limit_id: UUID,
    body: SubLimitUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: LimitsController = Depends(_build_controller),
) -> SubLimitOut:
    result = await ctrl.update_own_limit(user.id, limit_id, body)
    await session.commit()
    return result


@router.delete(
    "/sub/profile/limits/{limit_id}",
    summary="Delete a limit",
    description="Hard-deletes a limit owned by the authenticated sub.",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["limits"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        500: _ERROR_500,
    },
)
async def delete_own_limit(
    limit_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: LimitsController = Depends(_build_controller),
) -> Response:
    await ctrl.delete_own_limit(user.id, limit_id)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/sub/profile/triggers",
    summary="List own triggers",
    description="Returns every trigger recorded by the authenticated sub, newest first.",
    response_model=list[SubTriggerOut],
    status_code=status.HTTP_200_OK,
    tags=["triggers"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        500: _ERROR_500,
    },
)
async def list_own_triggers(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: LimitsController = Depends(_build_controller),
) -> list[SubTriggerOut]:
    return await ctrl.list_own_triggers(user.id)


@router.post(
    "/sub/profile/triggers",
    summary="Create a trigger",
    description=(
        "Creates a new trigger for the authenticated sub. "
        "Triggers do not require goddess acknowledgement — they surface "
        "directly on the goddess sub page."
    ),
    response_model=SubTriggerOut,
    status_code=status.HTTP_201_CREATED,
    tags=["triggers"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def create_own_trigger(
    body: SubTriggerCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: LimitsController = Depends(_build_controller),
) -> SubTriggerOut:
    result = await ctrl.create_own_trigger(user.id, body)
    await session.commit()
    return result


@router.patch(
    "/sub/profile/triggers/{trigger_id}",
    summary="Edit a trigger",
    description="Partially updates a trigger owned by the authenticated sub.",
    response_model=SubTriggerOut,
    status_code=status.HTTP_200_OK,
    tags=["triggers"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def update_own_trigger(
    trigger_id: UUID,
    body: SubTriggerUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: LimitsController = Depends(_build_controller),
) -> SubTriggerOut:
    result = await ctrl.update_own_trigger(user.id, trigger_id, body)
    await session.commit()
    return result


@router.delete(
    "/sub/profile/triggers/{trigger_id}",
    summary="Delete a trigger",
    description="Hard-deletes a trigger owned by the authenticated sub.",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["triggers"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        500: _ERROR_500,
    },
)
async def delete_own_trigger(
    trigger_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: LimitsController = Depends(_build_controller),
) -> Response:
    await ctrl.delete_own_trigger(user.id, trigger_id)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/goddess/subs/{sub_id}/limits",
    summary="List a sub's limits",
    description=(
        "Returns every limit declared by the given sub. "
        "The sub must belong to the authenticated goddess; requests for subs "
        "under a different goddess are rejected with 403."
    ),
    response_model=list[SubLimitOut],
    status_code=status.HTTP_200_OK,
    tags=["limits"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        500: _ERROR_500,
    },
)
async def list_sub_limits_for_goddess(
    sub_id: UUID,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: LimitsController = Depends(_build_controller),
) -> list[SubLimitOut]:
    return await ctrl.list_sub_limits_for_goddess(user.id, sub_id)


@router.get(
    "/goddess/subs/{sub_id}/triggers",
    summary="List a sub's triggers",
    description=(
        "Returns every trigger declared by the given sub. "
        "The sub must belong to the authenticated goddess; requests for subs "
        "under a different goddess are rejected with 403."
    ),
    response_model=list[SubTriggerOut],
    status_code=status.HTTP_200_OK,
    tags=["triggers"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        500: _ERROR_500,
    },
)
async def list_sub_triggers_for_goddess(
    sub_id: UUID,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: LimitsController = Depends(_build_controller),
) -> list[SubTriggerOut]:
    return await ctrl.list_sub_triggers_for_goddess(user.id, sub_id)


@router.post(
    "/goddess/subs/{sub_id}/limits/{limit_id}/acknowledge",
    summary="Acknowledge a sub's limit",
    description=(
        "Stamps `acknowledged_by_goddess_at = now()` on the limit, clearing "
        "the red badge on the goddess dashboard. "
        "Idempotent: if the limit is already acknowledged the current record "
        "is returned without re-stamping. "
        "The sub must belong to the authenticated goddess."
    ),
    response_model=SubLimitOut,
    status_code=status.HTTP_200_OK,
    tags=["limits"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        500: _ERROR_500,
    },
)
async def acknowledge_limit(
    sub_id: UUID,
    limit_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: LimitsController = Depends(_build_controller),
) -> SubLimitOut:
    result = await ctrl.acknowledge_limit(user.id, sub_id, limit_id)
    await session.commit()
    return result
