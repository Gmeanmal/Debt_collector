import datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import NotFound
from models.punishment_tier import PunishmentTier


class PunishmentTierDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, tier: PunishmentTier) -> PunishmentTier:
        """Persist a new punishment tier and return it with its database-assigned id."""
        self._session.add(tier)
        await self._session.flush()
        return tier

    async def get_by_id(self, tier_id: UUID) -> PunishmentTier:
        """Return a punishment tier by id, raising NotFound if absent."""
        row = await self._session.get(PunishmentTier, tier_id)
        if row is None:
            raise NotFound(f"punishment tier {tier_id} not found")
        return row

    async def list_for_goddess(self, goddess_id: UUID) -> list[PunishmentTier]:
        """Return every punishment tier for a goddess, oldest first."""
        result = await self._session.execute(
            select(PunishmentTier)
            .where(col(PunishmentTier.goddess_id) == goddess_id)
            .order_by(col(PunishmentTier.created_at).asc())
        )
        return list(result.scalars().all())

    async def update(self, tier: PunishmentTier, patch: dict[str, Any]) -> PunishmentTier:
        """Apply partial updates to a punishment tier and stamp updated_at."""
        for field, value in patch.items():
            setattr(tier, field, value)
        tier.updated_at = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        self._session.add(tier)
        await self._session.flush()
        return tier

    async def delete(self, tier: PunishmentTier) -> None:
        """Hard-delete a punishment tier row."""
        await self._session.delete(tier)
        await self._session.flush()
