from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.payment import (
    AllocationTargetType,
    PaymentAllocation,
    PaymentDeclaration,
    PaymentStatus,
)


class ContractPaymentStats:
    """Aggregated payment statistics for a single contract."""

    def __init__(
        self,
        total_paid: Decimal,
        payment_count: int,
        last_payment_at: datetime | None,
        first_payment_at: datetime | None,
    ) -> None:
        self.total_paid = total_paid
        self.payment_count = payment_count
        self.last_payment_at = last_payment_at
        self.first_payment_at = first_payment_at


class PaymentAllocationDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        declaration: PaymentDeclaration,
        target_type: AllocationTargetType,
        target_id: UUID | None,
    ) -> PaymentAllocation:
        alloc = PaymentAllocation(
            declaration_id=declaration.id,
            target_type=target_type,
            target_id=target_id,
            amount=declaration.amount,
        )
        self._session.add(alloc)
        await self._session.flush()
        return alloc

    async def list_for_target(
        self, target_type: AllocationTargetType, target_id: UUID
    ) -> list[PaymentAllocation]:
        result = await self._session.execute(
            select(PaymentAllocation).where(
                col(PaymentAllocation.target_type) == target_type,
                col(PaymentAllocation.target_id) == target_id,
            )
        )
        return list(result.scalars().all())

    async def sum_for_sub(self, sub_id: UUID) -> Decimal:
        result = await self._session.execute(
            select(func.coalesce(func.sum(PaymentDeclaration.amount), 0)).where(
                col(PaymentDeclaration.sub_id) == sub_id,
                col(PaymentDeclaration.status) == PaymentStatus.validated,
            )
        )
        return Decimal(str(result.scalar_one()))

    async def stats_for_contract(self, contract_id: UUID) -> ContractPaymentStats:
        """Return aggregated payment stats for a single contract.

        Joins validated PaymentDeclaration rows through PaymentAllocation where
        target_type is contract_debt and target_id matches the contract.
        """
        result = await self._session.execute(
            select(
                func.coalesce(func.sum(col(PaymentAllocation.amount)), 0).label("total_paid"),
                func.count(col(PaymentAllocation.id)).label("payment_count"),
                func.max(col(PaymentDeclaration.validated_at)).label("last_payment_at"),
                func.min(col(PaymentDeclaration.validated_at)).label("first_payment_at"),
            )
            .join(
                PaymentDeclaration,
                col(PaymentAllocation.declaration_id) == col(PaymentDeclaration.id),
            )
            .where(
                col(PaymentAllocation.target_type) == AllocationTargetType.contract_debt,
                col(PaymentAllocation.target_id) == contract_id,
                col(PaymentDeclaration.status) == PaymentStatus.validated,
            )
        )
        row = result.one()
        return ContractPaymentStats(
            total_paid=Decimal(str(row.total_paid)),
            payment_count=int(row.payment_count),
            last_payment_at=row.last_payment_at,
            first_payment_at=row.first_payment_at,
        )

    async def sum_for_goddess(self, goddess_id: UUID) -> Decimal:
        result = await self._session.execute(
            select(func.coalesce(func.sum(PaymentDeclaration.amount), 0)).where(
                col(PaymentDeclaration.goddess_id) == goddess_id,
                col(PaymentDeclaration.status) == PaymentStatus.validated,
            )
        )
        return Decimal(str(result.scalar_one()))
