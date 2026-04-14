from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.adjustment import AdjustmentStatus, ContractAdjustment
from models.debt import DebtContract


class AdjustmentDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, adjustment: ContractAdjustment) -> ContractAdjustment:
        self._session.add(adjustment)
        await self._session.flush()
        return adjustment

    async def get(self, adjustment_id: UUID) -> ContractAdjustment | None:
        return await self._session.get(ContractAdjustment, adjustment_id)

    async def list_pending_for_sub(self, sub_id: UUID) -> list[ContractAdjustment]:
        result = await self._session.execute(
            select(ContractAdjustment)
            .join(DebtContract, col(DebtContract.id) == col(ContractAdjustment.contract_id))
            .where(
                col(DebtContract.sub_id) == sub_id,
                col(ContractAdjustment.status) == AdjustmentStatus.pending_sub_approval,
            )
            .order_by(col(ContractAdjustment.created_at).desc())
        )
        return list(result.scalars().all())

    async def save(self, adjustment: ContractAdjustment) -> ContractAdjustment:
        self._session.add(adjustment)
        await self._session.flush()
        return adjustment
