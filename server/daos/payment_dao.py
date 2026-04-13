from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.payment import PaymentCategory, PaymentDeclaration, PaymentStatus


class PaymentDeclarationDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, payload_dict: dict[str, Any]) -> PaymentDeclaration:
        decl = PaymentDeclaration(**payload_dict)
        self._session.add(decl)
        await self._session.flush()
        return decl

    async def get_by_id(self, declaration_id: UUID) -> PaymentDeclaration | None:
        result = await self._session.execute(
            select(PaymentDeclaration).where(col(PaymentDeclaration.id) == declaration_id)
        )
        return result.scalar_one_or_none()

    async def list_for_sub(self, sub_id: UUID, limit: int = 50) -> list[PaymentDeclaration]:
        result = await self._session.execute(
            select(PaymentDeclaration)
            .where(col(PaymentDeclaration.sub_id) == sub_id)
            .order_by(col(PaymentDeclaration.declared_at).desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_pending_for_goddess(
        self, goddess_id: UUID, limit: int = 100
    ) -> list[PaymentDeclaration]:
        result = await self._session.execute(
            select(PaymentDeclaration)
            .where(
                col(PaymentDeclaration.goddess_id) == goddess_id,
                col(PaymentDeclaration.status) == PaymentStatus.pending,
            )
            .order_by(col(PaymentDeclaration.declared_at).asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def update(self, decl: PaymentDeclaration, patch: dict[str, Any]) -> PaymentDeclaration:
        for field, value in patch.items():
            setattr(decl, field, value)
        self._session.add(decl)
        await self._session.flush()
        return decl

    async def mark_validated(
        self,
        decl: PaymentDeclaration,
        validated_by: UUID,
        now: datetime,
        category: PaymentCategory,
    ) -> PaymentDeclaration:
        decl.status = PaymentStatus.validated
        decl.validated_by = validated_by
        decl.validated_at = now
        decl.category = category
        self._session.add(decl)
        await self._session.flush()
        return decl

    async def mark_rejected(
        self, decl: PaymentDeclaration, reason: str | None, now: datetime
    ) -> PaymentDeclaration:
        decl.status = PaymentStatus.rejected
        decl.rejection_reason = reason
        decl.validated_at = now
        self._session.add(decl)
        await self._session.flush()
        return decl

    async def mark_cancelled(self, decl: PaymentDeclaration, now: datetime) -> PaymentDeclaration:
        decl.status = PaymentStatus.cancelled
        decl.validated_at = now
        self._session.add(decl)
        await self._session.flush()
        return decl
