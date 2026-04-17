from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.kinks_controller import KinksController
from core.db import get_session
from decorators.audit import audit
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.kinks import (
    KinkMatrixOut,
    KinkOverviewOut,
    KinkProposalOut,
    KinkProposeIn,
    SubKinkRatingIn,
    SubKinkRatingOut,
)

_ERROR_401 = {"description": "Unauthorized — missing or invalid access token"}
_ERROR_403 = {
    "description": (
        "Forbidden — caller lacks the required role, the sub is not theirs, "
        "or the kink item is outside the caller's goddess catalog"
    )
}
_ERROR_404 = {"description": "Not found — kink item or sub does not exist"}
_ERROR_409 = {"description": "Conflict — sub has no assigned goddess, or proposal already approved"}
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
    "/goddess/kinks/overview",
    summary="Get per-item kink rating counts across all subs",
    description=(
        "Returns one aggregated row per kink item visible to the authenticated goddess "
        "(global items plus her own approved custom items). Each row includes a `counts` dict "
        "mapping every `KinkRating` value to the number of her subs who hold that rating. "
        "Subs with no explicit rating for an item are counted as `not_set`. "
        "The response is dense: all six rating keys are always present "
        "even when the count is zero. "
        "Items are ordered by category sort_order then item slug."
    ),
    response_model=KinkOverviewOut,
    status_code=200,
    tags=["kinks"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        500: _ERROR_500,
    },
)
async def get_kink_overview_for_goddess(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: KinksController = Depends(_build_controller),
) -> KinkOverviewOut:
    return await ctrl.overview_for_goddess(user.id)


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


@router.post(
    "/sub/profile/kinks/propose",
    summary="Propose a custom kink item",
    description=(
        "Submits a new custom kink item for the authenticated sub's goddess to review. "
        "The item is created with `approved=false` and will not appear in the kink matrix "
        "until the goddess approves it. A slug is auto-generated from the label with a "
        "random 4-character suffix to avoid collisions. "
        "Returns 409 when the sub has no assigned goddess."
    ),
    response_model=KinkProposalOut,
    status_code=201,
    tags=["kinks"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        409: _ERROR_409,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def propose_kink_item(
    body: KinkProposeIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: KinksController = Depends(_build_controller),
) -> KinkProposalOut:
    result = await ctrl.propose_as_sub(user.id, body)
    await session.commit()
    return result


@router.get(
    "/sub/profile/kinks/proposals",
    summary="List own pending kink proposals",
    description=(
        "Returns all custom kink items proposed by the authenticated sub that are still "
        "awaiting goddess approval (`approved=false`). Approved and rejected items are not "
        "included — rejected items are hard-deleted."
    ),
    response_model=list[KinkProposalOut],
    status_code=200,
    tags=["kinks"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        500: _ERROR_500,
    },
)
async def list_own_kink_proposals(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: KinksController = Depends(_build_controller),
) -> list[KinkProposalOut]:
    return await ctrl.list_sub_proposals(user.id)


@router.get(
    "/goddess/kinks/proposals",
    summary="List pending kink proposals from all subs",
    description=(
        "Returns all unapproved custom kink proposals submitted by any of the authenticated "
        "goddess's subs. Each entry includes the proposer's `username` for identification. "
        "Approved and rejected proposals are excluded."
    ),
    response_model=list[KinkProposalOut],
    status_code=200,
    tags=["kinks"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        500: _ERROR_500,
    },
)
async def list_goddess_kink_proposals(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: KinksController = Depends(_build_controller),
) -> list[KinkProposalOut]:
    return await ctrl.list_goddess_proposals(user.id)


@router.post(
    "/goddess/kinks/proposals/{item_id}/approve",
    summary="Approve a custom kink proposal",
    description=(
        "Flips `approved=true` on the given proposal, making the item immediately visible "
        "in the kink matrix for all subs belonging to this goddess. "
        "The proposal must belong to this goddess's scope and must still be pending. "
        "Returns 409 when the proposal is already approved."
    ),
    response_model=KinkProposalOut,
    status_code=200,
    tags=["kinks"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        409: _ERROR_409,
        500: _ERROR_500,
    },
)
@audit(kind="kink_proposal_approved", entity="kink_item")
async def approve_kink_proposal(
    item_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: KinksController = Depends(_build_controller),
) -> KinkProposalOut:
    result = await ctrl.approve_proposal(user.id, item_id)
    await session.commit()
    return result


@router.post(
    "/goddess/kinks/proposals/{item_id}/reject",
    summary="Reject and delete a custom kink proposal",
    description=(
        "Hard-deletes the pending kink proposal. Any `sub_kink_rating` rows referencing "
        "this item cascade-delete via the foreign key. The proposal must belong to this "
        "goddess's scope. Returns 204 on success."
    ),
    response_model=None,
    status_code=204,
    tags=["kinks"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        500: _ERROR_500,
    },
)
@audit(kind="kink_proposal_rejected", entity="kink_item")
async def reject_kink_proposal(
    item_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: KinksController = Depends(_build_controller),
) -> None:
    await ctrl.reject_proposal(user.id, item_id)
    await session.commit()
