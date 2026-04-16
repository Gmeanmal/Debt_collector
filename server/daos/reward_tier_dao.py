import datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import NotFound
from models.reward_tier import RewardTier


class RewardTierDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, tier: RewardTier) -> RewardTier:
        """Persist a new reward tier and return it with its database-assigned id."""
        self._session.add(tier)
        await self._session.flush()
        return tier

    async def get_by_id(self, tier_id: UUID) -> RewardTier:
        """Return a reward tier by id, raising NotFound if absent."""
        row = await self._session.get(RewardTier, tier_id)
        if row is None:
            raise NotFound(f"reward tier {tier_id} not found")
        return row

    async def list_for_goddess(
        self, goddess_id: UUID, *, only_active: bool = False
    ) -> list[RewardTier]:
        """Return all reward tiers for a goddess, oldest first.

        Set `only_active=True` to restrict to tiers with `active=true`.
        """
        stmt = select(RewardTier).where(col(RewardTier.goddess_id) == goddess_id)
        if only_active:
            stmt = stmt.where(col(RewardTier.active) == True)  # noqa: E712
        stmt = stmt.order_by(col(RewardTier.created_at).asc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update(self, tier: RewardTier, patch: dict[str, Any]) -> RewardTier:
        """Apply partial updates to a reward tier and stamp updated_at."""
        for field, value in patch.items():
            setattr(tier, field, value)
        tier.updated_at = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        self._session.add(tier)
        await self._session.flush()
        return tier

    async def delete(self, tier: RewardTier) -> None:
        """Hard-delete a reward tier row."""
        await self._session.delete(tier)
        await self._session.flush()
