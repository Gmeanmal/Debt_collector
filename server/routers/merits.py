from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.merits_controller import MeritsController
from core.db import get_session
from decorators.audit import audit
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.merits import (
    InvokeIn,
    PointsBalanceOut,
    PunishmentTierIn,
    PunishmentTierOut,
    PunishmentTierPatchIn,
    RedeemOut,
    RewardTierIn,
    RewardTierOut,
    RewardTierPatchIn,
)
from schemas.tasks import TaskOut

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch"}
_E404 = {"description": "Not found — resource does not exist or is not under this goddess"}
_E409 = {"description": "Conflict — tier inactive or redemption already exists"}
_E422 = {"description": "Unprocessable entity — payload validation or insufficient balance"}

router = APIRouter(tags=["merits"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> MeritsController:
    return MeritsController(session)


# ---------------------------------------------------------------------------
# Balances
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Reward tiers — goddess CRUD
# ---------------------------------------------------------------------------


@router.get(
    "/goddess/rewards",
    summary="List reward tiers",
    description=(
        "Returns every reward tier owned by the authenticated goddess, "
        "including inactive tiers. Ordered by creation time ascending."
    ),
    response_model=list[RewardTierOut],
    status_code=200,
    tags=["merits"],
    responses={401: _E401, 403: _E403},
)
async def list_reward_tiers(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: MeritsController = Depends(_ctrl),
) -> list[RewardTierOut]:
    return await ctrl.list_reward_tiers_for_goddess(user)


@router.post(
    "/goddess/rewards",
    summary="Create a reward tier",
    description=(
        "Creates a reward tier owned by the authenticated goddess. "
        "`cost` must be strictly positive; subs can redeem `active` tiers "
        "by spending the corresponding number of merit points."
    ),
    response_model=RewardTierOut,
    status_code=201,
    tags=["merits"],
    responses={401: _E401, 403: _E403, 422: _E422},
)
@audit(kind="reward_tier_created", entity="reward_tier")
async def create_reward_tier(
    body: RewardTierIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: MeritsController = Depends(_ctrl),
) -> RewardTierOut:
    result = await ctrl.create_reward_tier(user, body)
    await session.commit()
    return result


@router.patch(
    "/goddess/rewards/{reward_id}",
    summary="Update a reward tier",
    description=(
        "Partially updates a reward tier owned by the authenticated goddess. "
        "Only supplied fields are changed. Historical redemptions continue to "
        "reference the original `cost_snapshot`."
    ),
    response_model=RewardTierOut,
    status_code=200,
    tags=["merits"],
    responses={401: _E401, 403: _E403, 404: _E404, 422: _E422},
)
@audit(kind="reward_tier_updated", entity="reward_tier")
async def update_reward_tier(
    reward_id: UUID,
    body: RewardTierPatchIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: MeritsController = Depends(_ctrl),
) -> RewardTierOut:
    result = await ctrl.update_reward_tier(user, reward_id, body)
    await session.commit()
    return result


@router.delete(
    "/goddess/rewards/{reward_id}",
    summary="Delete a reward tier",
    description=(
        "Hard-deletes a reward tier owned by the authenticated goddess. "
        "Existing `reward_redemption` rows keep their frozen `cost_snapshot` "
        "because the FK uses RESTRICT — deletion fails if any redemption points at the tier."
    ),
    response_model=None,
    status_code=204,
    tags=["merits"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409},
)
@audit(kind="reward_tier_deleted", entity="reward_tier")
async def delete_reward_tier(
    reward_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: MeritsController = Depends(_ctrl),
) -> Response:
    await ctrl.delete_reward_tier(user, reward_id)
    await session.commit()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Punishment tiers — goddess CRUD
# ---------------------------------------------------------------------------


@router.get(
    "/goddess/punishments",
    summary="List punishment tiers",
    description=(
        "Returns every punishment tier owned by the authenticated goddess, "
        "including inactive tiers. Ordered by creation time ascending."
    ),
    response_model=list[PunishmentTierOut],
    status_code=200,
    tags=["merits"],
    responses={401: _E401, 403: _E403},
)
async def list_punishment_tiers(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: MeritsController = Depends(_ctrl),
) -> list[PunishmentTierOut]:
    return await ctrl.list_punishment_tiers_for_goddess(user)


@router.post(
    "/goddess/punishments",
    summary="Create a punishment tier",
    description=(
        "Creates a punishment tier owned by the authenticated goddess. "
        "`default_points_penalty` must be non-positive: it is subtracted from "
        "the sub's merit balance when the goddess invokes this punishment."
    ),
    response_model=PunishmentTierOut,
    status_code=201,
    tags=["merits"],
    responses={401: _E401, 403: _E403, 422: _E422},
)
@audit(kind="punishment_tier_created", entity="punishment_tier")
async def create_punishment_tier(
    body: PunishmentTierIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: MeritsController = Depends(_ctrl),
) -> PunishmentTierOut:
    result = await ctrl.create_punishment_tier(user, body)
    await session.commit()
    return result


@router.patch(
    "/goddess/punishments/{punishment_id}",
    summary="Update a punishment tier",
    description=(
        "Partially updates a punishment tier owned by the authenticated goddess. "
        "Only supplied fields are changed. Existing tasks created from this tier "
        "keep their original `points_on_miss`."
    ),
    response_model=PunishmentTierOut,
    status_code=200,
    tags=["merits"],
    responses={401: _E401, 403: _E403, 404: _E404, 422: _E422},
)
@audit(kind="punishment_tier_updated", entity="punishment_tier")
async def update_punishment_tier(
    punishment_id: UUID,
    body: PunishmentTierPatchIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: MeritsController = Depends(_ctrl),
) -> PunishmentTierOut:
    result = await ctrl.update_punishment_tier(user, punishment_id, body)
    await session.commit()
    return result


@router.delete(
    "/goddess/punishments/{punishment_id}",
    summary="Delete a punishment tier",
    description=(
        "Hard-deletes a punishment tier owned by the authenticated goddess. "
        "Existing tasks spawned from the tier keep their values (no FK to this table)."
    ),
    response_model=None,
    status_code=204,
    tags=["merits"],
    responses={401: _E401, 403: _E403, 404: _E404},
)
@audit(kind="punishment_tier_deleted", entity="punishment_tier")
async def delete_punishment_tier(
    punishment_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: MeritsController = Depends(_ctrl),
) -> Response:
    await ctrl.delete_punishment_tier(user, punishment_id)
    await session.commit()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Sub — browse + redeem
# ---------------------------------------------------------------------------


@router.get(
    "/sub/rewards",
    summary="List redeemable reward tiers",
    description=(
        "Returns active reward tiers owned by the authenticated sub's goddess. "
        "Inactive tiers are excluded. Returns 403 if the sub has no assigned goddess."
    ),
    response_model=list[RewardTierOut],
    status_code=200,
    tags=["merits"],
    responses={401: _E401, 403: _E403},
)
async def list_rewards_for_sub(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: MeritsController = Depends(_ctrl),
) -> list[RewardTierOut]:
    return await ctrl.list_active_rewards_for_sub(user)


@router.post(
    "/sub/rewards/{reward_id}/redeem",
    summary="Redeem a reward tier",
    description=(
        "Spends the sub's merit points to redeem a reward tier. The server "
        "re-checks the balance against `cost` before emitting the debit; a 422 "
        "is returned and no rows are written if the balance is insufficient. "
        "On success, a `reward_redemption` row is created and a MeritEvent with "
        "`source_kind='reward_redeem'` and `delta=-cost_snapshot` is emitted."
    ),
    response_model=RedeemOut,
    status_code=200,
    tags=["merits"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422},
)
async def redeem_reward(
    reward_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: MeritsController = Depends(_ctrl),
) -> RedeemOut:
    result = await ctrl.redeem_reward_as_sub(user, reward_id)
    await session.commit()
    return result


# ---------------------------------------------------------------------------
# Goddess — invoke a punishment
# ---------------------------------------------------------------------------


@router.post(
    "/goddess/punishments/{punishment_id}/invoke",
    summary="Invoke a punishment against a sub",
    description=(
        "Creates a `task` row carrying the punishment's `name` and `description` "
        "and emits a MeritEvent with `source_kind='punishment_invoke'` and "
        "`delta=default_points_penalty`. The task and the merit event are "
        "persisted in the same transaction (committed at the router boundary). "
        "Returns the created task."
    ),
    response_model=TaskOut,
    status_code=201,
    tags=["merits"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422},
)
@audit(kind="punishment_invoked", entity="task")
async def invoke_punishment(
    punishment_id: UUID,
    body: InvokeIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: MeritsController = Depends(_ctrl),
) -> TaskOut:
    result = await ctrl.invoke_punishment(user, punishment_id, body)
    await session.commit()
    return result
