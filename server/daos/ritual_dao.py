import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import NotFound
from models.ritual import Ritual, RitualFrequency


class RitualDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, ritual: Ritual) -> Ritual:
        """Persist a new ritual and return it with its database-assigned id."""
        self._session.add(ritual)
        await self._session.flush()
        return ritual

    async def get_by_id(self, ritual_id: UUID) -> Ritual:
        """Return a ritual by id, raising NotFound if absent."""
        row = await self._session.get(Ritual, ritual_id)
        if row is None:
            raise NotFound(f"ritual {ritual_id} not found")
        return row

    async def list_by_sub(self, sub_id: UUID) -> list[Ritual]:
        """Return all rituals (active and paused) belonging to a sub, newest first."""
        result = await self._session.execute(
            select(Ritual)
            .where(col(Ritual.sub_id) == sub_id)
            .order_by(col(Ritual.created_at).desc())
        )
        return list(result.scalars().all())

    async def list_active_by_goddess(self, goddess_id: UUID) -> list[Ritual]:
        """Return all un-paused rituals created by a goddess across all her subs."""
        result = await self._session.execute(
            select(Ritual)
            .where(
                col(Ritual.goddess_id) == goddess_id,
                col(Ritual.paused).is_(False),
            )
            .order_by(col(Ritual.created_at).desc())
        )
        return list(result.scalars().all())

    async def update(self, ritual: Ritual, **fields: object) -> Ritual:
        """Apply arbitrary field updates to an existing ritual row."""
        for key, value in fields.items():
            setattr(ritual, key, value)
        ritual.updated_at = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        self._session.add(ritual)
        await self._session.flush()
        return ritual

    async def pause(self, ritual_id: UUID) -> Ritual:
        """Set paused=True on a ritual, raising NotFound if absent."""
        ritual = await self.get_by_id(ritual_id)
        return await self.update(ritual, paused=True)

    async def unpause(self, ritual_id: UUID) -> Ritual:
        """Set paused=False on a ritual, raising NotFound if absent."""
        ritual = await self.get_by_id(ritual_id)
        return await self.update(ritual, paused=False)

    async def delete(self, ritual_id: UUID) -> None:
        """Hard-delete a ritual row, raising NotFound if absent."""
        ritual = await self.get_by_id(ritual_id)
        await self._session.delete(ritual)
        await self._session.flush()

    async def list_active_for_date(
        self, occurrence_date: datetime.date, frequency: RitualFrequency | None = None
    ) -> list[Ritual]:
        """Return all un-paused rituals, optionally filtered by frequency.

        Used by the cron job to seed occurrences for a given calendar date.
        """
        stmt = select(Ritual).where(col(Ritual.paused).is_(False))
        if frequency is not None:
            stmt = stmt.where(col(Ritual.frequency) == frequency)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
