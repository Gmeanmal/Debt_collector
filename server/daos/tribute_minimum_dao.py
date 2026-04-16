from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import NotFound
from models.payment import PaymentDeclaration, PaymentStatus
from models.tribute_minimum import TributeMinimum, TributePeriod


class TributeMinimumDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_for_sub(self, sub_id: UUID) -> TributeMinimum | None:
        """Return the tribute_minimum row for the given sub, or None if unconfigured."""
        return await self._session.get(TributeMinimum, sub_id)

    async def upsert(
        self,
        *,
        sub_id: UUID,
        goddess_id: UUID,
        amount: Decimal,
        period: TributePeriod,
        grace_below_percent: Decimal,
    ) -> tuple[TributeMinimum, bool]:
        """Insert or update the tribute_minimum for a sub.

        Returns (row, created) where created=True on first write.
        """
        now = datetime.now(UTC).replace(tzinfo=None)
        existing = await self._session.get(TributeMinimum, sub_id)
        if existing is None:
            row = TributeMinimum(
                sub_id=sub_id,
                goddess_id=goddess_id,
                amount=amount,
                period=period,
                grace_below_percent=grace_below_percent,
                created_at=now,
                updated_at=now,
            )
            self._session.add(row)
            await self._session.flush()
            return row, True

        existing.amount = amount
        existing.period = period
        existing.grace_below_percent = grace_below_percent
        existing.updated_at = now
        self._session.add(existing)
        await self._session.flush()
        return existing, False

    async def delete(self, sub_id: UUID) -> None:
        """Delete the tribute_minimum row for the given sub.

        Raises NotFound if no row exists.
        """
        row = await self._session.get(TributeMinimum, sub_id)
        if row is None:
            raise NotFound(f"tribute_minimum for sub {sub_id} not found")
        await self._session.delete(row)
        await self._session.flush()

    async def sum_validated_for_period(
        self,
        sub_id: UUID,
        goddess_id: UUID,
        period_start: datetime,
        period_end: datetime,
    ) -> Decimal:
        """Sum validated PaymentDeclaration amounts for a sub within a UTC period window.

        Counts all validated declarations regardless of category (tribute minimum
        covers all tribute categories). The caller supplies UTC-normalised boundaries.
        """
        result = await self._session.execute(
            select(func.coalesce(func.sum(col(PaymentDeclaration.amount)), 0)).where(
                col(PaymentDeclaration.sub_id) == sub_id,
                col(PaymentDeclaration.goddess_id) == goddess_id,
                col(PaymentDeclaration.status) == PaymentStatus.validated,
                col(PaymentDeclaration.declared_at) >= period_start,
                col(PaymentDeclaration.declared_at) < period_end,
            )
        )
        return Decimal(str(result.scalar_one()))
