from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from core.exceptions import BadRequest, Conflict, Forbidden, NotFound
from daos.allocation_dao import PaymentAllocationDao
from daos.payment_dao import PaymentDeclarationDao
from daos.payment_method_dao import PaymentMethodDao
from daos.user_dao import UserDao
from models.payment import (
    AllocationTargetType,
    PaymentAllocation,
    PaymentCategory,
    PaymentDeclaration,
    PaymentStatus,
)
from models.payment_method import PaymentMethod
from models.user import Goddess, User, UserRole, UserStatus
from schemas.payment import (
    AllocationOut,
    DeclarePaymentIn,
    EditDeclarationIn,
    PaymentOut,
    RecordPaymentIn,
)

_UNSUPPORTED_CATEGORIES = {
    PaymentCategory.rolling,
    PaymentCategory.weekly_debt,
    PaymentCategory.debt_payment,
    PaymentCategory.buyout,
}

_CATEGORY_TO_ALLOCATION_TARGET: dict[PaymentCategory, AllocationTargetType] = {
    PaymentCategory.entry: AllocationTargetType.entry,
    PaymentCategory.tribute: AllocationTargetType.tribute,
}


def _check_category_supported(category: PaymentCategory) -> None:
    if category in _UNSUPPORTED_CATEGORIES:
        # TODO(phase5): rolling requires active rolling tribute record
        # TODO(phase6): weekly_debt/debt_payment/buyout require active debt contract
        raise BadRequest("category not yet supported — requires rollings/contracts module")


def _check_category_for_sub(sub: User, category: PaymentCategory) -> None:
    _check_category_supported(category)
    if category == PaymentCategory.entry:
        if sub.status != UserStatus.pending_entry_tribute:
            raise BadRequest(
                "entry category only allowed while sub status is pending_entry_tribute"
            )
    elif category == PaymentCategory.tribute and sub.status == UserStatus.pending_entry_tribute:
        raise BadRequest("tribute category not allowed until entry is validated")


async def _resolve_goddess_id(session: AsyncSession, user_id: UUID) -> UUID:
    result = await session.execute(
        select(Goddess).join(User, User.goddess_id == Goddess.id).where(User.id == user_id)
    )
    goddess = result.scalar_one_or_none()
    if goddess is None:
        raise Forbidden("goddess profile not found for this user")
    return goddess.id


async def _get_method_for_goddess(
    method_dao: PaymentMethodDao, goddess_id: UUID, method_id: UUID
) -> PaymentMethod:
    method = await method_dao.get_by_id(method_id, goddess_id)
    if method is None:
        raise NotFound("payment method not found or not owned by this goddess")
    if not method.enabled:
        raise BadRequest("payment method is disabled")
    return method


async def _load_allocation(session: AsyncSession, declaration_id: UUID) -> PaymentAllocation | None:
    result = await session.execute(
        select(PaymentAllocation).where(PaymentAllocation.declaration_id == declaration_id)
    )
    return result.scalar_one_or_none()


async def _load_method_name(session: AsyncSession, method_id: UUID) -> str | None:
    result = await session.execute(select(PaymentMethod.name).where(PaymentMethod.id == method_id))
    return result.scalar_one_or_none()


async def _load_sub_display_name(session: AsyncSession, sub_id: UUID) -> str | None:
    result = await session.execute(select(User.first_name, User.last_name).where(User.id == sub_id))
    row = result.one_or_none()
    if row is None:
        return None
    first, last = row
    parts = [p for p in (first, last) if p]
    return " ".join(parts) if parts else None


async def _to_out(session: AsyncSession, decl: PaymentDeclaration) -> PaymentOut:
    allocation = await _load_allocation(session, decl.id)
    method_name = await _load_method_name(session, decl.method_id)
    sub_display_name = await _load_sub_display_name(session, decl.sub_id)

    alloc_out: AllocationOut | None = None
    if allocation is not None:
        alloc_out = AllocationOut(
            target_type=allocation.target_type,
            target_id=allocation.target_id,
            amount=Decimal(str(allocation.amount)),
            allocated_at=allocation.allocated_at,
        )

    return PaymentOut(
        id=decl.id,
        sub_id=decl.sub_id,
        sub_display_name=sub_display_name,
        goddess_id=decl.goddess_id,
        method_id=decl.method_id,
        method_name=method_name,
        amount=Decimal(str(decl.amount)),
        external_timestamp=decl.external_timestamp,
        note=decl.note,
        category=decl.category,
        status=decl.status,
        target_id=decl.target_id,
        created_by=decl.created_by,
        declared_at=decl.declared_at,
        validated_at=decl.validated_at,
        validated_by=decl.validated_by,
        rejection_reason=decl.rejection_reason,
        allocation=alloc_out,
    )


class PaymentController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._decl_dao = PaymentDeclarationDao(session)
        self._alloc_dao = PaymentAllocationDao(session)
        self._method_dao = PaymentMethodDao(session)
        self._user_dao = UserDao(session)

    async def declare_as_sub(self, sub_user: User, payload: DeclarePaymentIn) -> PaymentOut:
        _check_category_for_sub(sub_user, payload.category)

        if sub_user.goddess_id is None:
            raise BadRequest("sub is not linked to a goddess")

        goddess_id = sub_user.goddess_id
        await _get_method_for_goddess(self._method_dao, goddess_id, payload.method_id)

        decl = await self._decl_dao.create(
            {
                "sub_id": sub_user.id,
                "goddess_id": goddess_id,
                "method_id": payload.method_id,
                "amount": payload.amount,
                "external_timestamp": payload.external_timestamp,
                "note": payload.note,
                "category": payload.category,
                "status": PaymentStatus.pending,
                "target_id": payload.target_id,
                "created_by": sub_user.id,
            }
        )
        return await _to_out(self._session, decl)

    async def record_as_goddess(self, goddess_user: User, payload: RecordPaymentIn) -> PaymentOut:
        goddess_id = await _resolve_goddess_id(self._session, goddess_user.id)

        sub = await self._user_dao.get_by_id(payload.sub_id)
        if sub is None or sub.goddess_id != goddess_id:
            raise NotFound("sub not found or not linked to this goddess")

        _check_category_for_sub(sub, payload.category)
        await _get_method_for_goddess(self._method_dao, goddess_id, payload.method_id)

        now = datetime.utcnow()
        decl = await self._decl_dao.create(
            {
                "sub_id": sub.id,
                "goddess_id": goddess_id,
                "method_id": payload.method_id,
                "amount": payload.amount,
                "external_timestamp": payload.external_timestamp,
                "note": payload.note,
                "category": payload.category,
                "status": PaymentStatus.validated,
                "target_id": payload.target_id,
                "created_by": goddess_user.id,
                "validated_by": goddess_user.id,
                "validated_at": now,
            }
        )

        await self._emit_allocation(decl)
        if payload.category == PaymentCategory.entry:
            await self._promote_sub(sub)

        return await _to_out(self._session, decl)

    async def edit_pending_as_sub(
        self, sub_user: User, declaration_id: UUID, patch: EditDeclarationIn
    ) -> PaymentOut:
        decl = await self._get_declaration_or_404(declaration_id)
        if decl.sub_id != sub_user.id:
            raise Forbidden("declaration does not belong to this sub")
        if decl.status != PaymentStatus.pending:
            raise Conflict("only pending declarations can be edited")

        patch_dict = patch.model_dump(exclude_unset=True)

        if "category" in patch_dict:
            _check_category_for_sub(sub_user, patch_dict["category"])

        if "method_id" in patch_dict:
            if sub_user.goddess_id is None:
                raise BadRequest("sub is not linked to a goddess")
            await _get_method_for_goddess(
                self._method_dao, sub_user.goddess_id, patch_dict["method_id"]
            )

        await self._decl_dao.update(decl, patch_dict)
        return await _to_out(self._session, decl)

    async def cancel_pending_as_sub(self, sub_user: User, declaration_id: UUID) -> None:
        decl = await self._get_declaration_or_404(declaration_id)
        if decl.sub_id != sub_user.id:
            raise Forbidden("declaration does not belong to this sub")
        if decl.status != PaymentStatus.pending:
            raise Conflict("only pending declarations can be cancelled")

        await self._decl_dao.mark_cancelled(decl, datetime.utcnow())

    async def validate(
        self,
        goddess_user: User,
        declaration_id: UUID,
        recategorize_to: PaymentCategory | None,
    ) -> PaymentOut:
        goddess_id = await _resolve_goddess_id(self._session, goddess_user.id)
        decl = await self._get_declaration_or_404(declaration_id)
        if decl.goddess_id != goddess_id:
            raise Forbidden("declaration does not belong to this goddess")
        if decl.status != PaymentStatus.pending:
            raise Conflict("only pending declarations can be validated")

        category = recategorize_to if recategorize_to is not None else decl.category

        sub = await self._user_dao.get_by_id(decl.sub_id)
        if sub is None:
            raise NotFound("sub not found")

        _check_category_for_sub(sub, category)

        now = datetime.utcnow()
        await self._decl_dao.mark_validated(decl, goddess_user.id, now, category)
        await self._emit_allocation(decl)

        if category == PaymentCategory.entry:
            await self._promote_sub(sub)

        return await _to_out(self._session, decl)

    async def reject(
        self, goddess_user: User, declaration_id: UUID, reason: str | None
    ) -> PaymentOut:
        goddess_id = await _resolve_goddess_id(self._session, goddess_user.id)
        decl = await self._get_declaration_or_404(declaration_id)
        if decl.goddess_id != goddess_id:
            raise Forbidden("declaration does not belong to this goddess")
        if decl.status != PaymentStatus.pending:
            raise Conflict("only pending declarations can be rejected")

        decl.validated_by = goddess_user.id
        await self._decl_dao.mark_rejected(decl, reason, datetime.utcnow())
        return await _to_out(self._session, decl)

    async def list_my_history(self, sub_user: User) -> list[PaymentOut]:
        decls = await self._decl_dao.list_for_sub(sub_user.id)
        return [await _to_out(self._session, d) for d in decls]

    async def list_pending(self, goddess_user: User) -> list[PaymentOut]:
        goddess_id = await _resolve_goddess_id(self._session, goddess_user.id)
        decls = await self._decl_dao.list_pending_for_goddess(goddess_id)
        return [await _to_out(self._session, d) for d in decls]

    async def list_subs(self, goddess_user: User) -> list[dict]:
        goddess_id = await _resolve_goddess_id(self._session, goddess_user.id)
        result = await self._session.execute(
            select(User).where(col(User.goddess_id) == goddess_id, col(User.role) == UserRole.sub)
        )
        subs = result.scalars().all()
        return [
            {
                "id": str(s.id),
                "username": s.username,
                "display_name": " ".join(p for p in [s.first_name, s.last_name] if p) or s.username,
                "status": s.status,
            }
            for s in subs
        ]

    async def list_sub_payment_methods(self, sub_user: User) -> list:
        if sub_user.goddess_id is None:
            raise BadRequest("sub is not linked to a goddess")
        return await self._method_dao.list_by_goddess(sub_user.goddess_id, enabled_only=True)

    async def _get_declaration_or_404(self, declaration_id: UUID) -> PaymentDeclaration:
        decl = await self._decl_dao.get_by_id(declaration_id)
        if decl is None:
            raise NotFound("declaration not found")
        return decl

    async def _emit_allocation(self, decl: PaymentDeclaration) -> None:
        target_type = _CATEGORY_TO_ALLOCATION_TARGET.get(decl.category)
        if target_type is None:
            return
        await self._alloc_dao.create(decl, target_type, decl.target_id)

    async def _promote_sub(self, sub: User) -> None:
        sub.status = UserStatus.active
        self._session.add(sub)
        await self._session.flush()
