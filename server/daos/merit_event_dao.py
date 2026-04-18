import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from models.merit_event import MeritEvent


class MeritEventDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def insert_idempotent(self, event: MeritEvent) -> bool:
        """Persist a merit event, silently swallowing duplicate-source violations.

        Wraps the insert in a SAVEPOINT so the outer transaction (e.g. the
        status flip that triggered this credit) survives when the partial
        unique index on (source_kind, source_id) rejects a duplicate.
        """
        try:
            async with self._session.begin_nested():
                self._session.add(event)
                await self._session.flush()
            return True
        except IntegrityError:
            return False

    async def balance_for_sub(
        self, sub_id: UUID, goddess_id: UUID
    ) -> tuple[int, datetime.datetime | None, int]:
        """Return (balance, last_event_at, event_count) for a sub scoped to a goddess.

        Executes a single aggregated SELECT — no per-row fetching.
        """
        result = await self._session.execute(
            select(
                func.coalesce(func.sum(col(MeritEvent.delta)), 0).label("balance"),
                func.max(col(MeritEvent.created_at)).label("last_event_at"),
                func.count(col(MeritEvent.id)).label("event_count"),
            ).where(
                col(MeritEvent.sub_id) == sub_id,
                col(MeritEvent.goddess_id) == goddess_id,
            )
        )
        row = result.one()
        return int(row.balance), row.last_event_at, int(row.event_count)

    async def list_for_sub(
        self, sub_id: UUID, goddess_id: UUID, limit: int = 100
    ) -> list[MeritEvent]:
        """Return merit events for a sub scoped to a goddess, newest first."""
        result = await self._session.execute(
            select(MeritEvent)
            .where(
                col(MeritEvent.sub_id) == sub_id,
                col(MeritEvent.goddess_id) == goddess_id,
            )
            .order_by(col(MeritEvent.created_at).desc())
            .limit(limit)
        )
        return list(result.scalars().all())
