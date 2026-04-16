from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.status_event import StatusEvent
from models.sub_profile import OwnershipStatus


class StatusEventDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        sub_id: UUID,
        goddess_id: UUID,
        from_status: OwnershipStatus,
        to_status: OwnershipStatus,
        created_by: UUID,
        reason: str | None = None,
    ) -> StatusEvent:
        """Insert a status_event row recording an ownership status transition."""
        event = StatusEvent(
            sub_id=sub_id,
            goddess_id=goddess_id,
            from_status=from_status,
            to_status=to_status,
            reason=reason,
            created_by=created_by,
        )
        self._session.add(event)
        await self._session.flush()
        return event

    async def list_by_sub(self, sub_id: UUID, *, limit: int = 50) -> list[StatusEvent]:
        """Return the status events for a sub, newest first, capped at `limit`."""
        result = await self._session.execute(
            select(StatusEvent)
            .where(col(StatusEvent.sub_id) == sub_id)
            .order_by(col(StatusEvent.created_at).desc())
            .limit(limit)
        )
        return list(result.scalars().all())
