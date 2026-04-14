from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.debt_event import DebtEvent, EventType


class DebtEventDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, event: DebtEvent) -> DebtEvent:
        self._session.add(event)
        await self._session.flush()
        return event

    async def list_for_contract(self, contract_id: UUID) -> list[DebtEvent]:
        result = await self._session.execute(
            select(DebtEvent)
            .where(col(DebtEvent.contract_id) == contract_id)
            .order_by(col(DebtEvent.created_at).asc(), col(DebtEvent.id).asc())
        )
        return list(result.scalars().all())

    async def exists_for_period(
        self, contract_id: UUID, period_index: int, event_type: EventType
    ) -> bool:
        result = await self._session.execute(
            select(DebtEvent.id).where(
                col(DebtEvent.contract_id) == contract_id,
                col(DebtEvent.period_index) == period_index,
                col(DebtEvent.event_type) == event_type,
            )
        )
        return result.first() is not None

    async def last_period_interest_index(self, contract_id: UUID) -> int | None:
        result = await self._session.execute(
            select(DebtEvent)
            .where(
                col(DebtEvent.contract_id) == contract_id,
                col(DebtEvent.event_type) == EventType.period_interest,
            )
            .order_by(col(DebtEvent.period_index).desc())
            .limit(1)
        )
        row = result.scalar_one_or_none()
        return row.period_index if row is not None else None
