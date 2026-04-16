from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.kinks_controller import KinksController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.kinks import KinkMatrixOut, SubKinkRatingIn, SubKinkRatingOut

_ERROR_401 = {"description": "Unauthorized — missing or invalid access token"}
_ERROR_403 = {
    "description": (
        "Forbidden — caller lacks the required role, the sub is not theirs, "
        "or the kink item is outside the caller's goddess catalog"
    )
}
_ERROR_404 = {"description": "Not found — kink item or sub does not exist"}
_ERROR_422 = {"description": "Unprocessable entity — request body validation failed"}
_ERROR_500 = {"description": "Internal server error"}

router = APIRouter(tags=["kinks"])


def _build_controller(session: AsyncSession = Depends(get_session)) -> KinksController:
    return KinksController(session)


@router.get(
    "/sub/profile/kinks",
    summary="Get own kink matrix",
    description=(
        "Returns the full kink taxonomy visible to the authenticated sub, grouped by category. "
        "Each item includes the sub's current rating (or `not_set` when absent), any note, "
        "the item's `safety_flag`, and a `needs_confirmation` hint that is true when the item is "
        "safety-flagged AND the current rating is one of `curious`, `loves`, or `fetish_need`. "
        "Items owned by a different goddess are excluded."
    ),
    response_model=KinkMatrixOut,
    status_code=200,
    tags=["kinks"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        500: _ERROR_500,
    },
)
async def get_own_kink_matrix(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: KinksController = Depends(_build_controller),
) -> KinkMatrixOut:
    return await ctrl.get_matrix_for_self(user.id)


@router.put(
    "/sub/profile/kinks/{item_id}",
    summary="Upsert own kink rating",
    description=(
        "Creates or updates the authenticated sub's rating for a single kink item. "
        "The goddess scope is resolved server-side from the sub's profile; the item must belong "
        "to that scope (global item or owned by the sub's goddess). The response carries "
        "`needs_confirmation` so the client can decide whether to raise a confirmation prompt "
        "when the item is safety-flagged and the rating is `curious`, `loves`, or `fetish_need`."
    ),
    response_model=SubKinkRatingOut,
    status_code=200,
    tags=["kinks"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def upsert_own_kink_rating(
    item_id: UUID,
    body: SubKinkRatingIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: KinksController = Depends(_build_controller),
) -> SubKinkRatingOut:
    result = await ctrl.upsert_self_rating(user.id, item_id, body)
    await session.commit()
    return result


@router.get(
    "/goddess/subs/{sub_id}/kinks",
    summary="Get a sub's kink matrix",
    description=(
        "Returns the kink matrix for the given sub, read-only, from the authenticated goddess's "
        "perspective. The sub must belong to the caller; requests for subs under a different "
        "goddess are rejected with 403. Only items in the caller's catalog (global items plus "
        "items she owns) are included."
    ),
    response_model=KinkMatrixOut,
    status_code=200,
    tags=["kinks"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        500: _ERROR_500,
    },
)
async def get_sub_kink_matrix_for_goddess(
    sub_id: UUID,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: KinksController = Depends(_build_controller),
) -> KinkMatrixOut:
    return await ctrl.get_matrix_for_goddess(user.id, sub_id)
