from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.payment import (
    AllocationTargetType,
    PaymentAllocation,
    PaymentDeclaration,
    PaymentStatus,
)


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
                PaymentAllocation.target_type == target_type,
                PaymentAllocation.target_id == target_id,
            )
        )
        return list(result.scalars().all())

    async def sum_for_sub(self, sub_id: UUID) -> Decimal:
        result = await self._session.execute(
            select(func.coalesce(func.sum(PaymentDeclaration.amount), 0)).where(
                PaymentDeclaration.sub_id == sub_id,
                PaymentDeclaration.status == PaymentStatus.validated,
            )
        )
        return Decimal(str(result.scalar_one()))

    async def sum_for_goddess(self, goddess_id: UUID) -> Decimal:
        result = await self._session.execute(
            select(func.coalesce(func.sum(PaymentDeclaration.amount), 0)).where(
                PaymentDeclaration.goddess_id == goddess_id,
                PaymentDeclaration.status == PaymentStatus.validated,
            )
        )
        return Decimal(str(result.scalar_one()))
