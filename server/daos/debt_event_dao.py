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

    async def paid_period_indices_for_contracts(
        self, contract_ids: list[UUID]
    ) -> dict[UUID, set[int]]:
        """Return the set of period_index values with a payment_applied event, per contract."""
        if not contract_ids:
            return {}
        result = await self._session.execute(
            select(DebtEvent.contract_id, DebtEvent.period_index).where(
                col(DebtEvent.contract_id).in_(contract_ids),
                col(DebtEvent.event_type) == EventType.payment_applied,
            )
        )
        paid: dict[UUID, set[int]] = {}
        for contract_id, period_index in result.all():
            if period_index is None:
                continue
            paid.setdefault(contract_id, set()).add(period_index)
        return paid

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
