from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequest
from models.payment_method import PaymentMethod
from schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate


class PaymentMethodDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, goddess_id: UUID, payload: PaymentMethodCreate) -> PaymentMethod:
        result = await self._session.execute(
            select(func.max(PaymentMethod.sort_order)).where(PaymentMethod.goddess_id == goddess_id)
        )
        max_order = result.scalar()
        sort_order = (max_order + 1) if max_order is not None else 0

        method = PaymentMethod(
            goddess_id=goddess_id,
            name=payload.name,
            type=payload.type,
            handle_or_link=payload.handle_or_link,
            note=payload.note,
            enabled=payload.enabled,
            sort_order=sort_order,
        )
        self._session.add(method)
        await self._session.flush()
        return method

    async def list_by_goddess(
        self, goddess_id: UUID, enabled_only: bool = False
    ) -> list[PaymentMethod]:
        stmt = select(PaymentMethod).where(PaymentMethod.goddess_id == goddess_id)
        if enabled_only:
            stmt = stmt.where(PaymentMethod.enabled.is_(True))
        stmt = stmt.order_by(PaymentMethod.sort_order.asc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, method_id: UUID, goddess_id: UUID) -> PaymentMethod | None:
        result = await self._session.execute(
            select(PaymentMethod).where(
                PaymentMethod.id == method_id,
                PaymentMethod.goddess_id == goddess_id,
            )
        )
        return result.scalar_one_or_none()

    async def update(self, method: PaymentMethod, patch: PaymentMethodUpdate) -> PaymentMethod:
        for field, value in patch.model_dump(exclude_unset=True).items():
            setattr(method, field, value)
        method.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(method)
        await self._session.flush()
        return method

    async def soft_delete(self, method: PaymentMethod) -> None:
        method.enabled = False
        method.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(method)
        await self._session.flush()

    async def set_sort_orders(self, goddess_id: UUID, ordered_ids: list[UUID]) -> None:
        result = await self._session.execute(
            select(PaymentMethod).where(PaymentMethod.goddess_id == goddess_id)
        )
        owned = {m.id: m for m in result.scalars().all()}

        unknown = [mid for mid in ordered_ids if mid not in owned]
        if unknown:
            raise BadRequest(f"method id(s) not owned by this goddess: {unknown}")

        for position, method_id in enumerate(ordered_ids):
            owned[method_id].sort_order = position
            owned[method_id].updated_at = datetime.now(UTC).replace(tzinfo=None)
            self._session.add(owned[method_id])

        await self._session.flush()
