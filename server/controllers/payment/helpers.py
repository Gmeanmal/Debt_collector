from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import BadRequest, Forbidden, NotFound
from daos.payment_method_dao import PaymentMethodDao
from models.payment import (
    AllocationTargetType,
    PaymentAllocation,
    PaymentCategory,
    PaymentDeclaration,
)
from models.payment_method import PaymentMethod, PaymentMethodType
from models.user import Goddess, User, UserStatus
from schemas.payment import AllocationOut, PaymentOut

UNSUPPORTED_CATEGORIES: set[PaymentCategory] = set()

CATEGORY_TO_ALLOCATION_TARGET: dict[PaymentCategory, AllocationTargetType] = {
    PaymentCategory.entry: AllocationTargetType.entry,
    PaymentCategory.tribute: AllocationTargetType.tribute,
    PaymentCategory.rolling: AllocationTargetType.rolling_cycle,
    PaymentCategory.weekly_debt: AllocationTargetType.contract_debt,
    PaymentCategory.debt_payment: AllocationTargetType.contract_debt,
    PaymentCategory.buyout: AllocationTargetType.contract_buyout,
}

DEBT_PAYMENT_CATEGORIES = {
    PaymentCategory.weekly_debt,
    PaymentCategory.debt_payment,
}


def check_category_supported(category: PaymentCategory) -> None:
    if category in UNSUPPORTED_CATEGORIES:
        raise BadRequest("category not yet supported — requires contracts module")


def check_category_for_sub(sub: User, category: PaymentCategory) -> None:
    check_category_supported(category)
    if category == PaymentCategory.entry:
        if sub.status != UserStatus.pending_entry_tribute:
            raise BadRequest(
                "entry category only allowed while sub status is pending_entry_tribute"
            )
    elif category == PaymentCategory.tribute and sub.status == UserStatus.pending_entry_tribute:
        raise BadRequest("tribute category not allowed until entry is validated")


async def resolve_goddess_id(session: AsyncSession, user_id: UUID) -> UUID:
    result = await session.execute(
        select(Goddess)
        .join(User, col(User.goddess_id) == col(Goddess.id))
        .where(col(User.id) == user_id)
    )
    goddess = result.scalar_one_or_none()
    if goddess is None:
        raise Forbidden("goddess profile not found for this user")
    return goddess.id


async def get_method_for_goddess(
    method_dao: PaymentMethodDao, goddess_id: UUID, method_id: UUID
) -> PaymentMethod:
    method = await method_dao.get_by_id(method_id, goddess_id)
    if method is None:
        raise NotFound("payment method not found or not owned by this goddess")
    if not method.enabled:
        raise BadRequest("payment method is disabled")
    return method


async def load_allocation(session: AsyncSession, declaration_id: UUID) -> PaymentAllocation | None:
    result = await session.execute(
        select(PaymentAllocation).where(col(PaymentAllocation.declaration_id) == declaration_id)
    )
    return result.scalar_one_or_none()


async def load_method_name(session: AsyncSession, method_id: UUID) -> str | None:
    result = await session.execute(
        select(col(PaymentMethod.name)).where(col(PaymentMethod.id) == method_id)
    )
    return result.scalar_one_or_none()


async def load_method_summary(
    session: AsyncSession, method_id: UUID
) -> tuple[str | None, PaymentMethodType | None]:
    result = await session.execute(
        select(col(PaymentMethod.name), col(PaymentMethod.type)).where(
            col(PaymentMethod.id) == method_id
        )
    )
    row = result.one_or_none()
    if row is None:
        return None, None
    name, type_ = row
    return name, type_


async def load_sub_display_name(session: AsyncSession, sub_id: UUID) -> str | None:
    result = await session.execute(
        select(col(User.first_name), col(User.last_name)).where(col(User.id) == sub_id)
    )
    row = result.one_or_none()
    if row is None:
        return None
    first, last = row
    parts = [p for p in (first, last) if p]
    return " ".join(parts) if parts else None


async def to_out(session: AsyncSession, decl: PaymentDeclaration) -> PaymentOut:
    allocation = await load_allocation(session, decl.id)
    method_name, method_type = await load_method_summary(session, decl.method_id)
    sub_display_name = await load_sub_display_name(session, decl.sub_id)

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
        method_type=method_type,
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
        source=decl.source,
        allocation=alloc_out,
    )
