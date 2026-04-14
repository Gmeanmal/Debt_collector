import datetime as dt
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from controllers._goddess import resolve_goddess_id
from core.exceptions import BadRequest
from daos.payment_dao import PaymentDeclarationDao
from models.debt import (
    DebtContract,
    DebtContractStatus,
    PaymentFrequency,
)
from models.debt_event import DebtEvent, EventType
from models.payment import PaymentAllocation, PaymentDeclaration, PaymentStatus
from models.payment_method import PaymentMethod
from models.rolling import RollingTribute
from models.user import User, UserRole, UserStatus
from schemas.dashboard import (
    ActiveContractSummary,
    GoddessDashboardOut,
    LatePaymentItem,
    SubDashboardOut,
)
from schemas.payment import AllocationOut, PaymentOut
from utils.periods import current_period_index
from utils.rolling import amount_due as rolling_amount_due
from utils.rolling import days_late as rolling_days_late

_PENDING_CONTRACT_STATUSES = {
    DebtContractStatus.pending_sub,
    DebtContractStatus.pending_dom,
    DebtContractStatus.pending_dom_counter,
    DebtContractStatus.pending_sub_signature,
}

_LATE_LIMIT = 50


def _now_utc() -> dt.datetime:
    return dt.datetime.now(dt.UTC).replace(tzinfo=None)


def _display_name(user: User) -> str | None:
    parts = [p for p in (user.first_name, user.last_name) if p]
    if parts:
        return " ".join(parts)
    return user.username


def _period_length_days(freq: PaymentFrequency) -> int:
    if freq == PaymentFrequency.weekly:
        return 7
    if freq == PaymentFrequency.biweekly:
        return 14
    return 30


def _period_start(contract: DebtContract, now: dt.datetime) -> dt.datetime | None:
    if contract.signed_at is None:
        return None
    idx = current_period_index(contract, now)
    period_len = _period_length_days(contract.payment_frequency)
    return contract.signed_at + dt.timedelta(days=idx * period_len)


def _next_period_due(contract: DebtContract, now: dt.datetime) -> dt.datetime | None:
    if contract.signed_at is None:
        return None
    start = _period_start(contract, now)
    if start is None:
        return None
    return start + dt.timedelta(days=_period_length_days(contract.payment_frequency))


class DashboardController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._payment_dao = PaymentDeclarationDao(session)

    async def goddess_overview(self, goddess_user: User) -> GoddessDashboardOut:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)

        subs = await self._load_subs(goddess_id)
        sub_ids = [s.id for s in subs]

        subs_active = sum(1 for s in subs if s.status == UserStatus.active)
        subs_blacklisted = sum(1 for s in subs if s.status == UserStatus.blacklisted)
        subs_total = subs_active + subs_blacklisted

        rollings = await self._load_rollings_for_subs(sub_ids)
        rolling_count = sum(1 for r in rollings if not r.paused and Decimal(str(r.amount)) > 0)

        contracts = await self._load_contracts_for_goddess(goddess_id)
        contracts_active = sum(1 for c in contracts if c.status == DebtContractStatus.active)
        pending_contracts = sum(1 for c in contracts if c.status in _PENDING_CONTRACT_STATUSES)

        pending_validations = await self._count_pending_validations(goddess_id)
        total_drained = await self._sum_validated_for_goddess(goddess_id)

        late_items = await self._compute_late_payments(subs, rollings, contracts)

        return GoddessDashboardOut(
            subs_total=subs_total,
            subs_active=subs_active,
            subs_blacklisted=subs_blacklisted,
            rolling_count=rolling_count,
            contracts_active=contracts_active,
            pending_validations=pending_validations,
            pending_contracts=pending_contracts,
            late_payments=late_items,
            total_drained=total_drained,
        )

    async def sub_overview(self, sub_user: User) -> SubDashboardOut:
        if sub_user.role != UserRole.sub:
            raise BadRequest("user is not a sub")

        now = _now_utc()
        rolling = await self._load_rolling_for_sub(sub_user.id)
        contracts = await self._load_contracts_for_sub(sub_user.id)
        active_contracts = [c for c in contracts if c.status == DebtContractStatus.active]

        amount_due = Decimal("0")
        is_late = False

        if rolling is not None and not rolling.paused and Decimal(str(rolling.amount)) > 0:
            amount_due += rolling_amount_due(rolling, now)
            if rolling_days_late(rolling, now) > 0:
                is_late = True

        contract_late_map = await self._contracts_late_map(active_contracts, now)
        for c in active_contracts:
            if c.payment_frequency == PaymentFrequency.weekly:
                amount_due += Decimal(str(c.minimum_payment))
            if contract_late_map.get(c.id, 0) > 0:
                is_late = True

        summaries = [
            ActiveContractSummary(
                id=c.id,
                principal=Decimal(str(c.principal)),
                balance=Decimal(str(c.balance)),
                progress_percent=_progress_percent(c.principal, c.balance),
                status=c.status,
                next_period_due_at=_next_period_due(c, now),
            )
            for c in active_contracts
        ]

        recent_decls = await self._payment_dao.list_for_sub(sub_user.id, limit=10)
        recent: list[PaymentOut] = []
        for d in recent_decls:
            recent.append(await self._payment_to_out(d, sub_user))

        total_sent = await self._sum_validated_for_sub(sub_user.id)

        return SubDashboardOut(
            amount_due_this_week=amount_due,
            is_late=is_late,
            active_contracts=summaries,
            recent_payments=recent,
            total_sent=total_sent,
        )

    async def _load_subs(self, goddess_id: UUID) -> list[User]:
        result = await self._session.execute(
            select(User).where(
                col(User.goddess_id) == goddess_id,
                col(User.role) == UserRole.sub,
                col(User.status).in_([UserStatus.active, UserStatus.blacklisted]),
            )
        )
        return list(result.scalars().all())

    async def _load_rollings_for_subs(self, sub_ids: list[UUID]) -> list[RollingTribute]:
        if not sub_ids:
            return []
        result = await self._session.execute(
            select(RollingTribute).where(col(RollingTribute.sub_id).in_(sub_ids))
        )
        return list(result.scalars().all())

    async def _load_rolling_for_sub(self, sub_id: UUID) -> RollingTribute | None:
        result = await self._session.execute(
            select(RollingTribute).where(col(RollingTribute.sub_id) == sub_id)
        )
        return result.scalar_one_or_none()

    async def _load_contracts_for_goddess(self, goddess_id: UUID) -> list[DebtContract]:
        result = await self._session.execute(
            select(DebtContract).where(col(DebtContract.goddess_id) == goddess_id)
        )
        return list(result.scalars().all())

    async def _load_contracts_for_sub(self, sub_id: UUID) -> list[DebtContract]:
        result = await self._session.execute(
            select(DebtContract).where(col(DebtContract.sub_id) == sub_id)
        )
        return list(result.scalars().all())

    async def _count_pending_validations(self, goddess_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(PaymentDeclaration)
            .where(
                col(PaymentDeclaration.goddess_id) == goddess_id,
                col(PaymentDeclaration.status) == PaymentStatus.pending,
            )
        )
        return int(result.scalar_one() or 0)

    async def _sum_validated_for_goddess(self, goddess_id: UUID) -> Decimal:
        result = await self._session.execute(
            select(func.coalesce(func.sum(PaymentDeclaration.amount), 0)).where(
                col(PaymentDeclaration.goddess_id) == goddess_id,
                col(PaymentDeclaration.status) == PaymentStatus.validated,
            )
        )
        return Decimal(str(result.scalar_one() or 0))

    async def _sum_validated_for_sub(self, sub_id: UUID) -> Decimal:
        result = await self._session.execute(
            select(func.coalesce(func.sum(PaymentDeclaration.amount), 0)).where(
                col(PaymentDeclaration.sub_id) == sub_id,
                col(PaymentDeclaration.status) == PaymentStatus.validated,
            )
        )
        return Decimal(str(result.scalar_one() or 0))

    async def _payment_to_out(self, decl: PaymentDeclaration, sub: User) -> PaymentOut:
        alloc_result = await self._session.execute(
            select(PaymentAllocation).where(col(PaymentAllocation.declaration_id) == decl.id)
        )
        allocation = alloc_result.scalar_one_or_none()
        method_result = await self._session.execute(
            select(col(PaymentMethod.name)).where(col(PaymentMethod.id) == decl.method_id)
        )
        method_name = method_result.scalar_one_or_none()

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
            sub_display_name=_display_name(sub),
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
            source=decl.source,
            allocation=alloc_out,
        )

    async def _compute_late_payments(
        self,
        subs: list[User],
        rollings: list[RollingTribute],
        contracts: list[DebtContract],
    ) -> list[LatePaymentItem]:
        now = _now_utc()
        subs_by_id: dict[UUID, User] = {s.id: s for s in subs}
        active_sub_ids = {s.id for s in subs if s.status == UserStatus.active}

        items: list[LatePaymentItem] = []

        for rolling in rollings:
            if rolling.sub_id not in active_sub_ids:
                continue
            if rolling.paused or Decimal(str(rolling.amount)) == 0:
                continue
            late = rolling_days_late(rolling, now)
            if late <= 0:
                continue
            sub = subs_by_id.get(rolling.sub_id)
            if sub is None:
                continue
            items.append(
                LatePaymentItem(
                    sub_id=sub.id,
                    sub_display_name=_display_name(sub),
                    kind="rolling",
                    amount_due=rolling_amount_due(rolling, now),
                    days_late=late,
                    context_id=rolling.id,
                )
            )

        active_contracts = [
            c
            for c in contracts
            if c.status == DebtContractStatus.active and c.sub_id in active_sub_ids
        ]
        contract_late_map = await self._contracts_late_map(active_contracts, now)
        for c in active_contracts:
            late_days = contract_late_map.get(c.id, 0)
            if late_days <= 0:
                continue
            sub = subs_by_id.get(c.sub_id)
            if sub is None:
                continue
            items.append(
                LatePaymentItem(
                    sub_id=sub.id,
                    sub_display_name=_display_name(sub),
                    kind="contract",
                    amount_due=Decimal(str(c.minimum_payment)),
                    days_late=late_days,
                    context_id=c.id,
                )
            )

        items.sort(key=lambda it: it.days_late, reverse=True)
        return items[:_LATE_LIMIT]

    async def _contracts_late_map(
        self, contracts: list[DebtContract], now: dt.datetime
    ) -> dict[UUID, int]:
        """Return {contract_id: days_late} for contracts late on the current period.

        Late means: current period has no `payment_applied` event and the deadline
        has passed. days_late is measured from the current period start, capped at
        period length.
        """
        if not contracts:
            return {}

        contract_ids = [c.id for c in contracts]
        result = await self._session.execute(
            select(DebtEvent.contract_id, DebtEvent.period_index).where(
                col(DebtEvent.contract_id).in_(contract_ids),
                col(DebtEvent.event_type) == EventType.payment_applied,
            )
        )
        paid_periods: dict[UUID, set[int]] = {}
        for contract_id, period_index in result.all():
            if period_index is None:
                continue
            paid_periods.setdefault(contract_id, set()).add(period_index)

        late_map: dict[UUID, int] = {}
        for c in contracts:
            if c.signed_at is None:
                continue
            idx = current_period_index(c, now)
            period_start = _period_start(c, now)
            if period_start is None:
                continue
            period_len = _period_length_days(c.payment_frequency)
            days_into_period = (now.date() - period_start.date()).days
            if days_into_period <= 0:
                continue
            if idx in paid_periods.get(c.id, set()):
                continue
            late_map[c.id] = min(days_into_period, period_len)
        return late_map


def _progress_percent(principal: Decimal, balance: Decimal) -> Decimal:
    if principal <= 0:
        return Decimal("0.00")
    paid = Decimal(str(principal)) - Decimal(str(balance))
    pct = (paid / Decimal(str(principal))) * Decimal("100")
    if pct < 0:
        pct = Decimal("0")
    if pct > Decimal("100"):
        pct = Decimal("100")
    return pct.quantize(Decimal("0.01"))
