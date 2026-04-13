from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import Forbidden, NotFound
from daos.payment_method_dao import PaymentMethodDao
from models.payment_method import PaymentMethod
from models.user import Goddess, User
from schemas.payment_method import (
    PaymentMethodCreate,
    PaymentMethodOut,
    PaymentMethodUpdate,
)


def _to_out(method: PaymentMethod) -> PaymentMethodOut:
    return PaymentMethodOut.model_validate(method)


class PaymentMethodController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = PaymentMethodDao(session)

    async def _resolve_goddess_id(self, user_id: UUID) -> UUID:
        result = await self._session.execute(
            select(Goddess).join(User, User.goddess_id == Goddess.id).where(User.id == user_id)
        )
        goddess = result.scalar_one_or_none()
        if goddess is None:
            raise Forbidden("goddess profile not found for this user")
        return goddess.id

    async def _get_method_or_404(self, goddess_id: UUID, method_id: UUID) -> PaymentMethod:
        method = await self._dao.get_by_id(method_id, goddess_id)
        if method is None:
            raise NotFound("payment method not found")
        return method

    async def list_methods(
        self, goddess_user_id: UUID, enabled_only: bool = False
    ) -> list[PaymentMethodOut]:
        goddess_id = await self._resolve_goddess_id(goddess_user_id)
        methods = await self._dao.list_by_goddess(goddess_id, enabled_only=enabled_only)
        return [_to_out(m) for m in methods]

    async def create(self, goddess_user_id: UUID, payload: PaymentMethodCreate) -> PaymentMethodOut:
        goddess_id = await self._resolve_goddess_id(goddess_user_id)
        method = await self._dao.create(goddess_id, payload)
        return _to_out(method)

    async def update(
        self, goddess_user_id: UUID, method_id: UUID, patch: PaymentMethodUpdate
    ) -> PaymentMethodOut:
        goddess_id = await self._resolve_goddess_id(goddess_user_id)
        method = await self._get_method_or_404(goddess_id, method_id)
        updated = await self._dao.update(method, patch)
        return _to_out(updated)

    async def delete(self, goddess_user_id: UUID, method_id: UUID) -> None:
        goddess_id = await self._resolve_goddess_id(goddess_user_id)
        method = await self._get_method_or_404(goddess_id, method_id)
        await self._dao.soft_delete(method)

    async def reorder(
        self, goddess_user_id: UUID, ordered_ids: list[UUID]
    ) -> list[PaymentMethodOut]:
        goddess_id = await self._resolve_goddess_id(goddess_user_id)
        await self._dao.set_sort_orders(goddess_id, ordered_ids)
        methods = await self._dao.list_by_goddess(goddess_id)
        return [_to_out(m) for m in methods]
