from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.toys_controller import ToysController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.toys import (
    ToyItemCreateIn,
    ToyItemOut,
    ToyItemProposeIn,
    ToyItemUpdateIn,
)

_E400 = {"description": "Bad request — invalid payload or business rule violation"}
_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch"}
_E404 = {"description": "Not found — toy item or sub does not exist"}
_E409 = {"description": "Conflict — item state prevents this operation"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}

goddess_router = APIRouter(tags=["toys"])
sub_router = APIRouter(prefix="/sub/profile/toys", tags=["toys"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> ToysController:
    return ToysController(session)


@goddess_router.get(
    "/goddess/subs/{sub_id}/toys",
    summary="List a sub's toy inventory",
    description=(
        "Returns every toy item belonging to the given sub, including unapproved "
        "sub-proposed items. The sub must belong to the authenticated goddess; "
        "requests for subs under a different goddess are rejected with 403."
    ),
    response_model=list[ToyItemOut],
    status_code=200,
    tags=["toys"],
    responses={401: _E401, 403: _E403, 404: _E404},
)
async def list_toys_for_sub(
    sub_id: UUID,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: ToysController = Depends(_ctrl),
) -> list[ToyItemOut]:
    return await ctrl.list_for_goddess(user, sub_id)


@goddess_router.post(
    "/goddess/subs/{sub_id}/toys",
    summary="Add a toy item to a sub's inventory",
    description=(
        "Goddess creates a toy item for the given sub. The item is stored with "
        "`proposed_by=goddess` and `approved=true` so it is immediately visible on "
        "the sub's inventory."
    ),
    response_model=ToyItemOut,
    status_code=201,
    tags=["toys"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 422: _E422},
)
async def create_toy_for_sub(
    sub_id: UUID,
    body: ToyItemCreateIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: ToysController = Depends(_ctrl),
) -> ToyItemOut:
    result = await ctrl.create_as_goddess(user, sub_id, body)
    await session.commit()
    return result


@goddess_router.patch(
    "/goddess/toys/{toy_id}",
    summary="Update a toy item",
    description=(
        "Partially updates a toy item. Only `category`, `name`, `description`, and "
        "`photo_r2_key` are mutable via PATCH; `approved` is controlled exclusively "
        "by the approve/reject endpoints. Null values clear the corresponding field."
    ),
    response_model=ToyItemOut,
    status_code=200,
    tags=["toys"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 422: _E422},
)
async def update_toy(
    toy_id: UUID,
    body: ToyItemUpdateIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: ToysController = Depends(_ctrl),
) -> ToyItemOut:
    result = await ctrl.update_as_goddess(user, toy_id, body)
    await session.commit()
    return result


@goddess_router.delete(
    "/goddess/toys/{toy_id}",
    summary="Delete a toy item",
    description=(
        "Hard-deletes a toy item owned by the authenticated goddess regardless of "
        "its approval state. Use the reject endpoint to remove an unapproved "
        "sub proposal explicitly."
    ),
    response_model=None,
    status_code=204,
    tags=["toys"],
    responses={401: _E401, 403: _E403, 404: _E404},
)
async def delete_toy(
    toy_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: ToysController = Depends(_ctrl),
) -> Response:
    await ctrl.delete_as_goddess(user, toy_id)
    await session.commit()
    return Response(status_code=204)


@goddess_router.post(
    "/goddess/toys/{toy_id}/approve",
    summary="Approve a sub-proposed toy item",
    description=(
        "Flips `approved=true` on a sub-proposed toy item so it appears on the "
        "sub's inventory. Returns 400 if the item was goddess-created (already "
        "approved)."
    ),
    response_model=ToyItemOut,
    status_code=200,
    tags=["toys"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404},
)
async def approve_toy(
    toy_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: ToysController = Depends(_ctrl),
) -> ToyItemOut:
    result = await ctrl.approve_as_goddess(user, toy_id)
    await session.commit()
    return result


@goddess_router.post(
    "/goddess/toys/{toy_id}/reject",
    summary="Reject a sub-proposed toy item",
    description=(
        "Hard-deletes a sub-proposed toy item that has not yet been approved. "
        "Returns 400 if the item was goddess-created or 409 if the item is "
        "already approved (use DELETE to remove approved items)."
    ),
    response_model=None,
    status_code=204,
    tags=["toys"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409},
)
async def reject_toy(
    toy_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: ToysController = Depends(_ctrl),
) -> Response:
    await ctrl.reject_as_goddess(user, toy_id)
    await session.commit()
    return Response(status_code=204)


@sub_router.get(
    "",
    summary="List own toy inventory",
    description=(
        "Returns approved toy items belonging to the authenticated sub. Pending "
        "sub proposals are hidden until the goddess approves them."
    ),
    response_model=list[ToyItemOut],
    status_code=200,
    tags=["toys"],
    responses={400: _E400, 401: _E401, 403: _E403},
)
async def list_own_toys(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: ToysController = Depends(_ctrl),
) -> list[ToyItemOut]:
    return await ctrl.list_for_sub(user)


@sub_router.post(
    "",
    summary="Propose a toy item",
    description=(
        "Sub proposes a toy item for their goddess to review. Stored with "
        "`proposed_by=sub`, `approved=false`; the item stays hidden from the "
        "sub's inventory until the goddess approves it."
    ),
    response_model=ToyItemOut,
    status_code=201,
    tags=["toys"],
    responses={400: _E400, 401: _E401, 403: _E403, 422: _E422},
)
async def propose_own_toy(
    body: ToyItemProposeIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: ToysController = Depends(_ctrl),
) -> ToyItemOut:
    result = await ctrl.propose_as_sub(user, body)
    await session.commit()
    return result
