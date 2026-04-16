from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from core.exceptions import NotFound
from models.sub_limit import LimitSeverity
from models.sub_trigger import SubTrigger


class SubTriggerDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_sub(self, sub_id: UUID) -> list[SubTrigger]:
        """Return all triggers for the given sub, ordered by creation date descending."""
        result = await self._session.execute(
            select(SubTrigger)
            .where(col(SubTrigger.sub_id) == sub_id)
            .order_by(col(SubTrigger.created_at).desc())
        )
        return list(result.scalars().all())

    async def create(
        self,
        *,
        sub_id: UUID,
        goddess_id: UUID,
        trigger_text: str,
        severity: LimitSeverity,
        notes: str | None = None,
    ) -> SubTrigger:
        """Insert a new sub_trigger row and return it."""
        trigger = SubTrigger(
            sub_id=sub_id,
            goddess_id=goddess_id,
            trigger_text=trigger_text,
            severity=severity,
            notes=notes,
        )
        self._session.add(trigger)
        return trigger

    async def get(self, trigger_id: UUID) -> SubTrigger:
        """Return the trigger by PK, raising NotFound if absent."""
        row = await self._session.get(SubTrigger, trigger_id)
        if row is None:
            raise NotFound(f"sub_trigger {trigger_id} not found")
        return row

    async def update(
        self,
        trigger_id: UUID,
        *,
        trigger_text: str | None = None,
        notes: str | None = None,
        severity: LimitSeverity | None = None,
    ) -> SubTrigger:
        """Update mutable fields on an existing trigger row."""
        row = await self.get(trigger_id)
        if trigger_text is not None:
            row.trigger_text = trigger_text
        if notes is not None:
            row.notes = notes
        if severity is not None:
            row.severity = severity
        row.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(row)
        return row

    async def delete(self, trigger_id: UUID) -> None:
        """Hard-delete the trigger row, raising NotFound if absent."""
        row = await self.get(trigger_id)
        await self._session.delete(row)
