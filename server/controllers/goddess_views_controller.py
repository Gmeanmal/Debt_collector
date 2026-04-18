import asyncio
import datetime
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from controllers._goddess import resolve_goddess_id
from controllers.dashboard.helpers import period_length_days, period_start
from controllers.payment.helpers import to_out as payment_to_out
from daos.debt_dao import DebtContractDao
from daos.debt_event_dao import DebtEventDao
from daos.goddess_views_dao import GoddessViewsDao
from daos.payment_dao import PaymentDeclarationDao
from models.rolling import RollingTribute
from models.user import User, UserRole, UserStatus
from schemas.goddess_views import LateContractItem, LateSubItem, WeeklyPaymentBucket
from schemas.payment import PaymentOut
from utils.periods import current_period_index
from utils.rolling import amount_due as rolling_amount_due
from utils.rolling import days_late as rolling_days_late

LONDON = ZoneInfo("Europe/London")


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC).replace(tzinfo=None)


def _london_week_bounds_utc(
    week_start: datetime.date,
) -> tuple[datetime.datetime, datetime.datetime]:
    """Convert a London-local Monday date into naive UTC [start, end] bounds
    covering Monday 00:00:00 through Sunday 23:59:59.999999 local time.
    Accounts for BST via ZoneInfo — never hardcodes an offset.
    """
    week_end = week_start + datetime.timedelta(days=6)
    start_local = datetime.datetime.combine(week_start, datetime.time.min, tzinfo=LONDON)
    end_local = datetime.datetime.combine(
        week_end, datetime.time(23, 59, 59, 999999), tzinfo=LONDON
    )
    start_utc = start_local.astimezone(datetime.UTC).replace(tzinfo=None)
    end_utc = end_local.astimezone(datetime.UTC).replace(tzinfo=None)
    return start_utc, end_utc


def _display_name(user: User) -> str | None:
    parts = [p for p in (user.first_name, user.last_name) if p]
    if parts:
        return " ".join(parts)
    return user.username


class GoddessViewsController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = GoddessViewsDao(session)
        self._payment_dao = PaymentDeclarationDao(session)
        self._contract_dao = DebtContractDao(session)
        self._debt_event_dao = DebtEventDao(session)

    async def weekly_payments(self, goddess_user: User) -> list[WeeklyPaymentBucket]:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        buckets = await self._dao.weekly_payment_buckets(goddess_id)
        return [
            WeeklyPaymentBucket(
                week_start=week_start,
                week_end=week_end,
                total=total,
                count=count,
            )
            for week_start, week_end, total, count in buckets
        ]

    async def week_payments(
        self, goddess_user: User, week_start: datetime.date
    ) -> list[PaymentOut]:
        """Return validated payments for the calling goddess whose
        `validated_at` falls inside the Europe/London week starting at
        `week_start` (Monday 00:00 local) through Sunday 23:59:59.999999 local.
        Ordered by `validated_at` DESC. Scoped by goddess_id so the drill-down
        reconciles with the weekly aggregate even for now-inactive subs.
        """
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        window_start_utc, window_end_utc = _london_week_bounds_utc(week_start)

        decls = await self._payment_dao.list_validated_for_goddess_in_window(
            goddess_id, window_start_utc, window_end_utc
        )
        if not decls:
            return []

        return list(await asyncio.gather(*(payment_to_out(self._session, d) for d in decls)))

    async def late_subs(self, goddess_user: User) -> list[LateSubItem]:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)

        subs = await self._load_active_subs(goddess_id)
        if not subs:
            return []

        sub_ids = [s.id for s in subs]
        subs_by_id: dict[UUID, User] = {s.id: s for s in subs}

        rollings = await self._load_rollings(sub_ids)
        last_payments = await self._dao.last_validated_payment_per_sub(sub_ids, goddess_id)

        now = _now_utc()
        items: list[LateSubItem] = []

        for rolling in rollings:
            if rolling.paused or Decimal(str(rolling.amount)) == 0:
                continue
            late = rolling_days_late(rolling, now)
            if late <= 0:
                continue
            sub = subs_by_id.get(rolling.sub_id)
            if sub is None:
                continue
            items.append(
                LateSubItem(
                    sub_id=sub.id,
                    display_name=_display_name(sub),
                    days_late=late,
                    overdue_amount=rolling_amount_due(rolling, now),
                    last_payment_at=last_payments.get(sub.id),
                )
            )

        items.sort(key=lambda it: it.days_late, reverse=True)
        return items

    async def late_contracts(self, goddess_user: User) -> list[LateContractItem]:
        """Return active contracts under this goddess where the current period payment is overdue.

        Predicate mirrors DashboardController._contracts_late_map (the adjacent dashboard
        late-section surface): active contracts with signed_at set, days_into_period > 0
        on UTC-naive values, and current period_index not in the paid_period_indices set.
        days_late is capped at period_length_days(payment_frequency) so an unpaid weekly
        period never reports a double-digit value.
        """
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        now = _now_utc()

        active_subs = await self._load_active_subs(goddess_id)
        if not active_subs:
            return []

        active_sub_ids = {s.id for s in active_subs}
        subs_by_id: dict[UUID, User] = {s.id: s for s in active_subs}

        contracts = await self._contract_dao.list_active_for_goddess(goddess_id)
        relevant = [c for c in contracts if c.sub_id in active_sub_ids and c.signed_at is not None]
        if not relevant:
            return []

        contract_ids = [c.id for c in relevant]
        paid_periods = await self._debt_event_dao.paid_period_indices_for_contracts(contract_ids)
        last_payments = await self._debt_event_dao.last_applied_per_contract(contract_ids)

        items: list[LateContractItem] = []

        for c in relevant:
            p_start = period_start(c, now)
            if p_start is None:
                continue
            days_into = (now.date() - p_start.date()).days
            if days_into <= 0:
                continue
            idx = current_period_index(c, now)
            if idx in paid_periods.get(c.id, set()):
                continue
            sub = subs_by_id.get(c.sub_id)
            if sub is None:
                continue
            p_len = period_length_days(c.payment_frequency)
            items.append(
                LateContractItem(
                    contract_id=c.id,
                    slug=c.slug,
                    sub_id=sub.id,
                    sub_display_name=_display_name(sub),
                    sub_username=sub.username,
                    days_late=min(days_into, p_len),
                    overdue_amount=c.minimum_payment,
                    last_payment_at=last_payments.get(c.id),
                )
            )

        items.sort(
            key=lambda it: (-it.days_late, (it.sub_display_name or "").lower()),
        )
        return items

    async def _load_active_subs(self, goddess_id: UUID) -> list[User]:
        result = await self._session.execute(
            select(User).where(
                col(User.goddess_id) == goddess_id,
                col(User.role) == UserRole.sub,
                col(User.status) == UserStatus.active,
            )
        )
        return list(result.scalars().all())

    async def _load_rollings(self, sub_ids: list[UUID]) -> list[RollingTribute]:
        if not sub_ids:
            return []
        result = await self._session.execute(
            select(RollingTribute).where(col(RollingTribute.sub_id).in_(sub_ids))
        )
        return list(result.scalars().all())
