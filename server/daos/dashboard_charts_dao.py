import datetime
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.debt import DebtContract, DebtContractStatus
from models.payment import (
    PaymentCategory,
    PaymentDeclaration,
    PaymentStatus,
)
from models.payment_method import PaymentMethod, PaymentMethodType
from models.rolling import RollingTribute
from models.user import User, UserRole, UserStatus

LONDON = ZoneInfo("Europe/London")

_ROLLING_CATEGORIES = {PaymentCategory.rolling}
_ONE_OFF_CATEGORIES = {
    PaymentCategory.tribute,
    PaymentCategory.entry,
    PaymentCategory.profile_change_fee,
}
_CONTRACT_CATEGORIES = {
    PaymentCategory.weekly_debt,
    PaymentCategory.debt_payment,
    PaymentCategory.buyout,
}


class DashboardChartsDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def monthly_revenue(
        self,
        goddess_id: UUID,
    ) -> list[tuple[str, Decimal, Decimal, Decimal]]:
        """Return last 12 months as (month_label, rolling, one_off, contract).

        month_label is YYYY-MM in Europe/London.
        """
        today_london = datetime.datetime.now(LONDON).date()
        months: list[datetime.date] = []
        year, month = today_london.year, today_london.month
        for _ in range(12):
            months.append(datetime.date(year, month, 1))
            month -= 1
            if month == 0:
                month = 12
                year -= 1
        months.reverse()

        oldest = months[0]
        oldest_utc = datetime.datetime.combine(oldest, datetime.time.min)

        result = await self._session.execute(
            select(
                PaymentDeclaration.validated_at,
                PaymentDeclaration.amount,
                PaymentDeclaration.category,
            ).where(
                col(PaymentDeclaration.goddess_id) == goddess_id,
                col(PaymentDeclaration.status) == PaymentStatus.validated,
                col(PaymentDeclaration.validated_at) >= oldest_utc,
            )
        )
        rows = result.all()

        buckets: dict[str, list[Decimal]] = {}
        for m in months:
            label = m.strftime("%Y-%m")
            buckets[label] = [Decimal("0"), Decimal("0"), Decimal("0")]

        for validated_at, amount, category in rows:
            if validated_at is None:
                continue
            val_london = validated_at.replace(tzinfo=datetime.UTC).astimezone(LONDON)
            label = val_london.strftime("%Y-%m")
            if label not in buckets:
                continue
            dec = Decimal(str(amount))
            if category in _ROLLING_CATEGORIES:
                buckets[label][0] += dec
            elif category in _ONE_OFF_CATEGORIES:
                buckets[label][1] += dec
            elif category in _CONTRACT_CATEGORIES:
                buckets[label][2] += dec

        return [(label, vals[0], vals[1], vals[2]) for label, vals in sorted(buckets.items())]

    async def method_breakdown(
        self,
        goddess_id: UUID,
    ) -> list[tuple[PaymentMethodType, Decimal, int]]:
        """Return (method_type, total, count) for all validated payments, desc by total."""
        result = await self._session.execute(
            select(
                col(PaymentMethod.type),
                func.sum(col(PaymentDeclaration.amount)).label("total"),
                func.count(col(PaymentDeclaration.id)).label("cnt"),
            )
            .join(PaymentMethod, col(PaymentDeclaration.method_id) == col(PaymentMethod.id))
            .where(
                col(PaymentDeclaration.goddess_id) == goddess_id,
                col(PaymentDeclaration.status) == PaymentStatus.validated,
            )
            .group_by(col(PaymentMethod.type))
            .order_by(text("total DESC"))
        )
        return [
            (PaymentMethodType(row[0]), Decimal(str(row[1] or 0)), int(row[2] or 0))
            for row in result.all()
        ]

    async def subs_by_status(
        self,
        goddess_id: UUID,
    ) -> dict[str, tuple[int, int]]:
        """Return {status: (rolling_count, contract_count)} for all subs."""
        subs_result = await self._session.execute(
            select(User.id, User.status).where(
                col(User.goddess_id) == goddess_id,
                col(User.role) == UserRole.sub,
            )
        )
        subs: list[tuple[UUID, str]] = list(subs_result.all())
        sub_ids = [s[0] for s in subs]

        if not sub_ids:
            return {}

        rollings_result = await self._session.execute(
            select(RollingTribute.sub_id).where(
                col(RollingTribute.sub_id).in_(sub_ids),
                col(RollingTribute.paused).is_(False),
            )
        )
        active_rolling_sub_ids: set[UUID] = {row[0] for row in rollings_result.all()}

        contracts_result = await self._session.execute(
            select(DebtContract.sub_id).where(
                col(DebtContract.goddess_id) == goddess_id,
                col(DebtContract.status) == DebtContractStatus.active,
                col(DebtContract.sub_id).in_(sub_ids),
            )
        )
        active_contract_sub_ids: set[UUID] = {row[0] for row in contracts_result.all()}

        counts: dict[str, list[int]] = {}
        for sub_id, status in subs:
            if status not in counts:
                counts[status] = [0, 0]
            if sub_id in active_rolling_sub_ids:
                counts[status][0] += 1
            if sub_id in active_contract_sub_ids:
                counts[status][1] += 1

        return {status: (vals[0], vals[1]) for status, vals in counts.items()}

    async def top_subs(
        self,
        goddess_id: UUID,
        limit: int = 5,
    ) -> list[tuple[str, str, Decimal]]:
        """Return (display_name, username, total) top limit subs by total validated payments."""
        result = await self._session.execute(
            select(
                col(User.first_name),
                col(User.last_name),
                col(User.username),
                func.sum(col(PaymentDeclaration.amount)).label("total"),
            )
            .join(User, col(PaymentDeclaration.sub_id) == col(User.id))
            .where(
                col(PaymentDeclaration.goddess_id) == goddess_id,
                col(PaymentDeclaration.status) == PaymentStatus.validated,
                col(User.role) == UserRole.sub,
            )
            .group_by(col(User.id), col(User.first_name), col(User.last_name), col(User.username))
            .order_by(text("total DESC"))
            .limit(limit)
        )
        out = []
        for first_name, last_name, username, total in result.all():
            parts = [p for p in (first_name, last_name) if p]
            display = " ".join(parts) if parts else username
            out.append((display, username, Decimal(str(total or 0))))
        return out

    async def daily_late_counts(
        self,
        goddess_id: UUID,
    ) -> list[tuple[datetime.date, int]]:
        """Return (date, count) for past 30 days where count = distinct late subs.

        Uses validated_at gaps: a sub is counted as late on day D if their
        rolling tribute deadline fell on or before D and there was no validated
        rolling payment in the cycle that contained D. This is expensive to compute
        precisely for historical data without a dedicated table, so we approximate by
        counting distinct subs that have a validated_at record for rolling payments
        per day and inverting — subs with active rollings but no payment on that day.

        Simplified approach: return count of distinct subs who had at least one
        late-rolling payment declaration (rolling category, validated) with
        validated_at >= D. For the sparkline this is a reasonable proxy.

        Real implementation: we count per day how many subs had a rolling tribute
        and the latest rolling validated_at before D is more than 7 days old.
        We compute this by fetching all active rolling subs and their last_paid_at,
        then for each of the past 30 days count how many had a deadline that passed.
        """
        today_london = datetime.datetime.now(LONDON).date()
        days = [today_london - datetime.timedelta(days=i) for i in range(29, -1, -1)]

        subs_result = await self._session.execute(
            select(User.id).where(
                col(User.goddess_id) == goddess_id,
                col(User.role) == UserRole.sub,
                col(User.status) == UserStatus.active,
            )
        )
        sub_ids = [row[0] for row in subs_result.all()]
        if not sub_ids:
            return [(d, 0) for d in days]

        rollings_result = await self._session.execute(
            select(
                RollingTribute.sub_id,
                RollingTribute.last_paid_at,
                RollingTribute.amount,
                RollingTribute.deadline_day,
            ).where(
                col(RollingTribute.sub_id).in_(sub_ids),
                col(RollingTribute.paused).is_(False),
            )
        )
        rolling_rows = rollings_result.all()

        result_list: list[tuple[datetime.date, int]] = []
        for day in days:
            count = 0
            for _, last_paid_at, amount, _ in rolling_rows:
                if Decimal(str(amount)) <= 0:
                    continue
                if last_paid_at is None:
                    count += 1
                    continue
                last_paid_london = (
                    last_paid_at.replace(tzinfo=datetime.UTC).astimezone(LONDON).date()
                )
                if (day - last_paid_london).days > 7:
                    count += 1
            result_list.append((day, count))

        return result_list

    async def contract_states(
        self,
        goddess_id: UUID,
    ) -> tuple[int, int, int]:
        """Return (active, completed, breached) contract counts."""
        result = await self._session.execute(
            select(
                col(DebtContract.status),
                func.count(col(DebtContract.id)).label("cnt"),
            )
            .where(
                col(DebtContract.goddess_id) == goddess_id,
                col(DebtContract.status).in_(
                    [
                        DebtContractStatus.active,
                        DebtContractStatus.completed,
                        DebtContractStatus.breached,
                    ]
                ),
            )
            .group_by(col(DebtContract.status))
        )
        counts: dict[str, int] = {}
        for status, cnt in result.all():
            counts[str(status)] = int(cnt)

        return (
            counts.get(DebtContractStatus.active, 0),
            counts.get(DebtContractStatus.completed, 0),
            counts.get(DebtContractStatus.breached, 0),
        )
