from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from core.exceptions import Conflict, Forbidden, NotFound, Validation
from daos.merit_event_dao import MeritEventDao
from daos.punishment_tier_dao import PunishmentTierDao
from daos.reward_redemption_dao import RewardRedemptionDao
from daos.reward_tier_dao import RewardTierDao
from daos.task_dao import TaskDao
from daos.user_dao import UserDao
from models.merit_event import MeritEvent, MeritSourceKind
from models.punishment_tier import PunishmentTier
from models.reward_redemption import RewardRedemption
from models.reward_tier import RewardTier
from models.task import Task, TaskStatus
from models.user import User, UserRole
from schemas.merits import (
    InvokeIn,
    MeritEventOut,
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


def _reward_to_out(tier: RewardTier) -> RewardTierOut:
    return RewardTierOut.model_validate(tier)


def _punishment_to_out(tier: PunishmentTier) -> PunishmentTierOut:
    return PunishmentTierOut.model_validate(tier)


class MeritsController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = MeritEventDao(session)
        self._user_dao = UserDao(session)
        self._reward_dao = RewardTierDao(session)
        self._punishment_dao = PunishmentTierDao(session)
        self._redemption_dao = RewardRedemptionDao(session)
        self._task_dao = TaskDao(session)

    # ------------------------------------------------------------------
    # Balances
    # ------------------------------------------------------------------

    async def get_balance_for_sub_self(self, user: User) -> PointsBalanceOut:
        """Return the merit points balance for the authenticated sub."""
        if user.goddess_id is None:
            raise Forbidden("sub has no assigned goddess")
        balance, last_event_at, event_count = await self._dao.balance_for_sub(
            user.id, user.goddess_id
        )
        return PointsBalanceOut(
            balance=balance,
            last_event_at=last_event_at,
            event_count=event_count,
        )

    async def get_balance_for_goddess_scoped(
        self, goddess_user: User, sub_id: UUID
    ) -> PointsBalanceOut:
        """Return the merit points balance for a sub, visible to the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        sub = await self._user_dao.get_by_id(sub_id)
        if sub is None or sub.role != UserRole.sub:
            raise NotFound("sub not found")
        if sub.goddess_id != goddess_id:
            raise Forbidden("sub does not belong to this goddess")
        balance, last_event_at, event_count = await self._dao.balance_for_sub(sub_id, goddess_id)
        return PointsBalanceOut(
            balance=balance,
            last_event_at=last_event_at,
            event_count=event_count,
        )

    # ------------------------------------------------------------------
    # Reward tiers — goddess CRUD
    # ------------------------------------------------------------------

    async def list_reward_tiers_for_goddess(self, goddess_user: User) -> list[RewardTierOut]:
        """List every reward tier owned by the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        tiers = await self._reward_dao.list_for_goddess(goddess_id)
        return [_reward_to_out(t) for t in tiers]

    async def create_reward_tier(self, goddess_user: User, payload: RewardTierIn) -> RewardTierOut:
        """Create a new reward tier owned by the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        tier = RewardTier(
            goddess_id=goddess_id,
            name=payload.name,
            description=payload.description,
            cost=payload.cost,
            active=payload.active,
        )
        created = await self._reward_dao.create(tier)
        return _reward_to_out(created)

    async def update_reward_tier(
        self, goddess_user: User, tier_id: UUID, patch: RewardTierPatchIn
    ) -> RewardTierOut:
        """Partially update a reward tier owned by the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        tier = await self._require_owned_reward(goddess_id, tier_id)
        fields: dict[str, Any] = patch.model_dump(exclude_unset=True)
        if not fields:
            return _reward_to_out(tier)
        updated = await self._reward_dao.update(tier, fields)
        return _reward_to_out(updated)

    async def delete_reward_tier(self, goddess_user: User, tier_id: UUID) -> None:
        """Hard-delete a reward tier owned by the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        tier = await self._require_owned_reward(goddess_id, tier_id)
        await self._reward_dao.delete(tier)

    # ------------------------------------------------------------------
    # Punishment tiers — goddess CRUD
    # ------------------------------------------------------------------

    async def list_punishment_tiers_for_goddess(
        self, goddess_user: User
    ) -> list[PunishmentTierOut]:
        """List every punishment tier owned by the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        tiers = await self._punishment_dao.list_for_goddess(goddess_id)
        return [_punishment_to_out(t) for t in tiers]

    async def create_punishment_tier(
        self, goddess_user: User, payload: PunishmentTierIn
    ) -> PunishmentTierOut:
        """Create a new punishment tier owned by the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        tier = PunishmentTier(
            goddess_id=goddess_id,
            name=payload.name,
            description=payload.description,
            default_points_penalty=payload.default_points_penalty,
            active=payload.active,
        )
        created = await self._punishment_dao.create(tier)
        return _punishment_to_out(created)

    async def update_punishment_tier(
        self, goddess_user: User, tier_id: UUID, patch: PunishmentTierPatchIn
    ) -> PunishmentTierOut:
        """Partially update a punishment tier owned by the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        tier = await self._require_owned_punishment(goddess_id, tier_id)
        fields: dict[str, Any] = patch.model_dump(exclude_unset=True)
        if not fields:
            return _punishment_to_out(tier)
        updated = await self._punishment_dao.update(tier, fields)
        return _punishment_to_out(updated)

    async def delete_punishment_tier(self, goddess_user: User, tier_id: UUID) -> None:
        """Hard-delete a punishment tier owned by the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        tier = await self._require_owned_punishment(goddess_id, tier_id)
        await self._punishment_dao.delete(tier)

    # ------------------------------------------------------------------
    # Sub — browse + redeem rewards
    # ------------------------------------------------------------------

    async def list_active_rewards_for_sub(self, sub_user: User) -> list[RewardTierOut]:
        """List active reward tiers visible to the authenticated sub's goddess."""
        if sub_user.goddess_id is None:
            raise Forbidden("sub has no assigned goddess")
        tiers = await self._reward_dao.list_for_goddess(sub_user.goddess_id, only_active=True)
        return [_reward_to_out(t) for t in tiers]

    async def redeem_reward_as_sub(self, sub_user: User, reward_id: UUID) -> RedeemOut:
        """Redeem a reward tier on behalf of the authenticated sub.

        Flow (single transaction, commit owned by the router):
          1. Re-check the sub's balance against the tier cost; 422 if insufficient.
          2. Insert the MeritEvent debit first so the (source_kind, source_id)
             unique index protects us against concurrent double-spends.
          3. Insert the reward_redemption row referencing the same id.
        """
        if sub_user.goddess_id is None:
            raise Forbidden("sub has no assigned goddess")
        tier = await self._reward_dao.get_by_id(reward_id)
        if tier.goddess_id != sub_user.goddess_id:
            raise Forbidden("reward does not belong to this sub's goddess")
        if not tier.active:
            raise Conflict("reward is not active")

        balance, _, _ = await self._dao.balance_for_sub(sub_user.id, sub_user.goddess_id)
        if balance < tier.cost:
            raise Validation("insufficient points balance to redeem this reward")

        redemption = RewardRedemption(
            sub_id=sub_user.id,
            goddess_id=sub_user.goddess_id,
            reward_id=tier.id,
            cost_snapshot=tier.cost,
        )
        created_redemption = await self._redemption_dao.create(redemption)

        event = MeritEvent(
            sub_id=sub_user.id,
            goddess_id=sub_user.goddess_id,
            source_kind=MeritSourceKind.reward_redeem,
            source_id=created_redemption.id,
            delta=-tier.cost,
        )
        inserted = await self._dao.insert_idempotent(event)
        if not inserted:
            raise Conflict("merit event for this redemption already exists")

        new_balance, _, _ = await self._dao.balance_for_sub(sub_user.id, sub_user.goddess_id)
        return RedeemOut(redemption_id=created_redemption.id, new_balance=new_balance)

    # ------------------------------------------------------------------
    # Goddess — invoke punishment (creates task + emits debit)
    # ------------------------------------------------------------------

    async def invoke_punishment(
        self, goddess_user: User, punishment_id: UUID, body: InvokeIn
    ) -> TaskOut:
        """Invoke a punishment against a sub: creates a Task and emits a debit event.

        The Task is created first so we have a stable task_id to use as the
        MeritEvent.source_id — guaranteeing idempotency via the partial unique
        index on (source_kind, source_id).
        """
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        tier = await self._require_owned_punishment(goddess_id, punishment_id)
        if not tier.active:
            raise Conflict("punishment is not active")
        sub = await self._user_dao.get_by_id(body.sub_id)
        if sub is None or sub.role != UserRole.sub:
            raise NotFound("sub not found")
        if sub.goddess_id != goddess_id:
            raise Forbidden("sub does not belong to this goddess")

        task = Task(
            sub_id=sub.id,
            goddess_id=goddess_id,
            title=tier.name,
            description=tier.description,
            points_on_miss=tier.default_points_penalty,
            status=TaskStatus.open,
        )
        created_task = await self._task_dao.create(task)

        event = MeritEvent(
            sub_id=sub.id,
            goddess_id=goddess_id,
            source_kind=MeritSourceKind.punishment_invoke,
            source_id=created_task.id,
            delta=tier.default_points_penalty,
        )
        await self._dao.insert_idempotent(event)

        return TaskOut.model_validate(created_task)

    # ------------------------------------------------------------------
    # Goddess — per-sub merit event ledger
    # ------------------------------------------------------------------

    async def list_events_for_sub(
        self, goddess_user: User, sub_id: UUID
    ) -> list[MeritEventOut]:
        """Return merit events for a sub scoped to the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        sub = await self._user_dao.get_by_id(sub_id)
        if sub is None or sub.role != UserRole.sub:
            raise NotFound("sub not found")
        if sub.goddess_id != goddess_id:
            raise Forbidden("sub does not belong to this goddess")
        events = await self._dao.list_for_sub(sub_id, goddess_id)
        return [MeritEventOut.model_validate(e) for e in events]

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _require_owned_reward(self, goddess_id: UUID, tier_id: UUID) -> RewardTier:
        tier = await self._reward_dao.get_by_id(tier_id)
        if tier.goddess_id != goddess_id:
            raise Forbidden("reward tier does not belong to this goddess")
        return tier

    async def _require_owned_punishment(self, goddess_id: UUID, tier_id: UUID) -> PunishmentTier:
        tier = await self._punishment_dao.get_by_id(tier_id)
        if tier.goddess_id != goddess_id:
            raise Forbidden("punishment tier does not belong to this goddess")
        return tier
