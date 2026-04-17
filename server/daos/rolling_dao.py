import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.rolling import RollingTribute
from schemas.rolling import RollingTributeIn


class RollingTributeDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_for_sub(self, sub_id: UUID) -> RollingTribute | None:
        """Return the rolling tribute record for the given sub, or None."""
        result = await self._session.execute(
            select(RollingTribute).where(col(RollingTribute.sub_id) == sub_id)
        )
        return result.scalar_one_or_none()

    async def list_for_sub_ids(self, sub_ids: list[UUID]) -> list[RollingTribute]:
        """Return all rolling tribute records for the given sub ids in one query."""
        if not sub_ids:
            return []
        result = await self._session.execute(
            select(RollingTribute).where(col(RollingTribute.sub_id).in_(sub_ids))
        )
        return list(result.scalars().all())

    async def upsert(
        self, sub_id: UUID, goddess_id: UUID, payload: RollingTributeIn
    ) -> RollingTribute:
        """Create or update the rolling tribute record for the given sub."""
        existing = await self.get_for_sub(sub_id)
        now = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)

        if existing is not None:
            existing.amount = float(payload.amount)
            existing.deadline_day = payload.deadline_day
            existing.deadline_time = payload.deadline_time
            existing.late_multiplier_per_day = payload.late_multiplier_per_day
            existing.paused = payload.paused
            existing.notes = payload.notes
            existing.updated_at = now
            self._session.add(existing)
            await self._session.flush()
            return existing

        record = RollingTribute(
            sub_id=sub_id,
            goddess_id=goddess_id,
            amount=float(payload.amount),
            deadline_day=payload.deadline_day,
            deadline_time=payload.deadline_time,
            late_multiplier_per_day=payload.late_multiplier_per_day,
            paused=payload.paused,
            notes=payload.notes,
        )
        self._session.add(record)
        await self._session.flush()
        return record

    async def mark_paid(self, sub_id: UUID, at: datetime.datetime) -> None:
        """Record a successful payment by updating last_paid_at."""
        record = await self.get_for_sub(sub_id)
        if record is None:
            return
        record.last_paid_at = at
        record.updated_at = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        self._session.add(record)
        await self._session.flush()
