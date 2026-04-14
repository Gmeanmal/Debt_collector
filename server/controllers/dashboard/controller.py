import datetime as dt
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from controllers._goddess import resolve_goddess_id
from controllers.dashboard.helpers import (
    display_name,
    next_period_due,
    period_length_days,
    period_start,
    progress_percent,
)
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
    SubPlanningOut,
    UpcomingPaymentItem,
    WeeklyPaymentTotal,
)
from schemas.payment import AllocationOut, PaymentOut
from utils.periods import current_period_index
from utils.rolling import amount_due as rolling_amount_due
from utils.rolling import current_cycle_deadline
from utils.rolling import days_late as rolling_days_late

_LONDON = ZoneInfo("Europe/London")

_PENDING_CONTRACT_STATUSES = {
    DebtContractStatus.pending_sub,
    DebtContractStatus.pending_dom,
    DebtContractStatus.pending_dom_counter,
    DebtContractStatus.pending_sub_signature,
}

_LATE_LIMIT = 50


def _now_utc() -> dt.datetime:
    return dt.datetime.now(dt.UTC).replace(tzinfo=None)


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
                progress_percent=progress_percent(c.principal, c.balance),
                status=c.status,
                next_period_due_at=next_period_due(c, now),
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

    async def sub_planning(self, sub_user: User) -> SubPlanningOut:
        if sub_user.role != UserRole.sub:
            raise BadRequest("user is not a sub")

        now_utc = _now_utc()
        now_london = dt.datetime.now(dt.UTC).astimezone(_LONDON)
        today_london = now_london.date()

        upcoming = await self._build_upcoming(sub_user.id, now_utc, today_london)
        weekly_history = await self._build_weekly_history(sub_user.id, today_london)
        total_all_time = await self._sum_validated_for_sub(sub_user.id)
        total_this_month = await self._sum_validated_this_month(sub_user.id, today_london)
        rolling_remaining = await self._rolling_remaining_this_month(
            sub_user.id, now_utc, today_london
        )

        return SubPlanningOut(
            upcoming=upcoming,
            weekly_history=weekly_history,
            total_paid_all_time=total_all_time,
            total_paid_this_month=total_this_month,
            rolling_remaining_this_month=rolling_remaining,
        )

    async def _build_upcoming(
        self,
        sub_id: UUID,
        now_utc: dt.datetime,
        today_london: dt.date,
    ) -> list[UpcomingPaymentItem]:
        horizon = today_london + dt.timedelta(days=30)
        items: list[UpcomingPaymentItem] = []

        rolling = await self._load_rolling_for_sub(sub_id)
        if rolling is not None and not rolling.paused and Decimal(str(rolling.amount)) > 0:
            cursor = current_cycle_deadline(rolling, now_utc)
            cursor_london = cursor.replace(tzinfo=dt.UTC).astimezone(_LONDON).date()
            while cursor_london <= horizon:
                if cursor_london >= today_london:
                    items.append(
                        UpcomingPaymentItem(
                            date=cursor_london,
                            amount=Decimal(str(rolling.amount)),
                            kind="rolling",
                            label="Weekly tribute",
                        )
                    )
                cursor += dt.timedelta(days=7)
                cursor_london = cursor.replace(tzinfo=dt.UTC).astimezone(_LONDON).date()

        contracts = await self._load_contracts_for_sub(sub_id)
        active = [c for c in contracts if c.status == DebtContractStatus.active and c.signed_at]
        for contract in active:
            period_len = period_length_days(contract.payment_frequency)
            next_due = next_period_due(contract, now_utc)
            if next_due is None:
                continue
            next_due_london = next_due.replace(tzinfo=dt.UTC).astimezone(_LONDON).date()
            while next_due_london <= horizon:
                if next_due_london >= today_london:
                    items.append(
                        UpcomingPaymentItem(
                            date=next_due_london,
                            amount=Decimal(str(contract.minimum_payment)),
                            kind="contract_instalment",
                            label=(
                                f"Contract instalment"
                                f" £{contract.minimum_payment}"
                                f"/{contract.payment_frequency.value[:2]}"
                            ),
                        )
                    )
                next_due += dt.timedelta(days=period_len)
                next_due_london = next_due.replace(tzinfo=dt.UTC).astimezone(_LONDON).date()

        items.sort(key=lambda it: it.date)
        return items

    async def _build_weekly_history(
        self,
        sub_id: UUID,
        today_london: dt.date,
    ) -> list[WeeklyPaymentTotal]:
        weeks_back = 12
        monday = today_london - dt.timedelta(days=today_london.weekday())
        start_monday = monday - dt.timedelta(weeks=weeks_back - 1)

        week_starts = [start_monday + dt.timedelta(weeks=i) for i in range(weeks_back)]

        result = await self._session.execute(
            select(
                func.date_trunc("week", PaymentDeclaration.validated_at).label("week"),
                func.sum(PaymentDeclaration.amount).label("total"),
            )
            .where(
                col(PaymentDeclaration.sub_id) == sub_id,
                col(PaymentDeclaration.status) == PaymentStatus.validated,
                col(PaymentDeclaration.validated_at)
                >= dt.datetime.combine(start_monday, dt.time.min),
            )
            .group_by(func.date_trunc("week", PaymentDeclaration.validated_at))
        )
        db_rows: dict[dt.date, Decimal] = {}
        for row in result.all():
            week_val = row[0]
            if week_val is not None:
                d = week_val.date() if hasattr(week_val, "date") else week_val
                db_rows[d] = Decimal(str(row[1] or 0))

        history: list[WeeklyPaymentTotal] = []
        for ws in week_starts:
            history.append(
                WeeklyPaymentTotal(
                    week_start=ws,
                    total=db_rows.get(ws, Decimal("0.00")),
                )
            )
        return history

    async def _sum_validated_this_month(self, sub_id: UUID, today_london: dt.date) -> Decimal:
        month_start = today_london.replace(day=1)
        result = await self._session.execute(
            select(func.coalesce(func.sum(PaymentDeclaration.amount), 0)).where(
                col(PaymentDeclaration.sub_id) == sub_id,
                col(PaymentDeclaration.status) == PaymentStatus.validated,
                col(PaymentDeclaration.validated_at)
                >= dt.datetime.combine(month_start, dt.time.min),
            )
        )
        return Decimal(str(result.scalar_one() or 0))

    async def _rolling_remaining_this_month(
        self,
        sub_id: UUID,
        now_utc: dt.datetime,
        today_london: dt.date,
    ) -> Decimal:
        rolling = await self._load_rolling_for_sub(sub_id)
        if rolling is None or rolling.paused or Decimal(str(rolling.amount)) == 0:
            return Decimal("0.00")

        month_end = (today_london.replace(day=1) + dt.timedelta(days=32)).replace(day=1)
        total = Decimal("0.00")
        cursor = current_cycle_deadline(rolling, now_utc)
        cursor_london = cursor.replace(tzinfo=dt.UTC).astimezone(_LONDON).date()
        while cursor_london < month_end:
            if cursor_london >= today_london:
                total += Decimal(str(rolling.amount))
            cursor += dt.timedelta(days=7)
            cursor_london = cursor.replace(tzinfo=dt.UTC).astimezone(_LONDON).date()
        return total

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
            sub_display_name=display_name(sub),
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
                    sub_display_name=display_name(sub),
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
                    sub_display_name=display_name(sub),
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
            p_start = period_start(c, now)
            if p_start is None:
                continue
            p_len = period_length_days(c.payment_frequency)
            days_into_period = (now.date() - p_start.date()).days
            if days_into_period <= 0:
                continue
            if idx in paid_periods.get(c.id, set()):
                continue
            late_map[c.id] = min(days_into_period, p_len)
        return late_map
