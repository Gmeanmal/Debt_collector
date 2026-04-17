import asyncio
import datetime as dt
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from controllers.dashboard.helpers import next_period_due, now_utc, period_start
from daos.adjustment_dao import AdjustmentDao
from daos.debt_dao import DebtContractDao
from daos.debt_event_dao import DebtEventDao
from daos.journal_dao import JournalDao
from daos.ritual_occurrence_dao import RitualOccurrenceDao
from daos.rolling_dao import RollingTributeDao
from daos.task_dao import TaskDao
from models.debt import DebtContract
from models.rolling import RollingTribute
from models.user import User
from schemas.dashboard import SubDashboardSummary
from utils.periods import LONDON, current_period_index
from utils.rolling import amount_due as rolling_amount_due
from utils.rolling import current_cycle_deadline
from utils.rolling import days_late as rolling_days_late


class SubDashboardSummaryController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._adjustment_dao = AdjustmentDao(session)
        self._contract_dao = DebtContractDao(session)
        self._debt_event_dao = DebtEventDao(session)
        self._journal_dao = JournalDao(session)
        self._occurrence_dao = RitualOccurrenceDao(session)
        self._rolling_dao = RollingTributeDao(session)
        self._task_dao = TaskDao(session)

    async def sub_summary(self, sub_user: User) -> SubDashboardSummary:
        """Return live KPI counters for the sub welcome dashboard."""
        now = now_utc()
        today_london = dt.datetime.now(LONDON).date()

        (
            pending_approvals_count,
            today_rituals_count,
            today_open_tasks_count,
            journal_streak_days,
            rolling,
            active_contracts,
        ) = await asyncio.gather(
            self._adjustment_dao.count_pending_for_sub(sub_user.id),
            self._occurrence_dao.count_today_for_sub(sub_user.id, today_london),
            self._task_dao.count_open_or_submitted_for_sub(sub_user.id),
            self._journal_dao.current_streak_days(sub_user.id),
            self._rolling_dao.get_for_sub(sub_user.id),
            self._contract_dao.list_active_for_sub(sub_user.id),
        )

        late_rolling_amount = Decimal("0.00")
        if (
            rolling is not None
            and not rolling.paused
            and Decimal(str(rolling.amount)) != 0
            and rolling_days_late(rolling, now) > 0
        ):
            late_rolling_amount = rolling_amount_due(rolling, now)

        late_contract_amount = await self._compute_late_contract_amount(active_contracts, now)

        next_payment_amount, next_payment_due_at = self._compute_next_payment(
            rolling, active_contracts, now
        )

        return SubDashboardSummary(
            pending_approvals_count=pending_approvals_count,
            next_payment_amount=next_payment_amount,
            next_payment_due_at=next_payment_due_at,
            late_rolling_amount=late_rolling_amount,
            late_contract_amount=late_contract_amount,
            today_rituals_count=today_rituals_count,
            today_open_tasks_count=today_open_tasks_count,
            journal_streak_days=journal_streak_days,
        )

    async def _compute_late_contract_amount(
        self,
        active_contracts: list[DebtContract],
        now: dt.datetime,
    ) -> Decimal:
        """Sum minimum_payment for active contracts whose current period is unpaid and overdue."""
        signed = [c for c in active_contracts if c.signed_at is not None]
        if not signed:
            return Decimal("0.00")

        paid_periods = await self._debt_event_dao.paid_period_indices_for_contracts(
            [c.id for c in signed]
        )

        now_london = now.replace(tzinfo=dt.UTC).astimezone(LONDON).date()
        total = Decimal("0.00")
        for c in signed:
            p_start = period_start(c, now)
            if p_start is None:
                continue
            p_start_london = p_start.replace(tzinfo=dt.UTC).astimezone(LONDON).date()
            if (now_london - p_start_london).days <= 0:
                continue
            idx = current_period_index(c, now)
            if idx in paid_periods.get(c.id, set()):
                continue
            total += Decimal(str(c.minimum_payment))
        return total

    def _compute_next_payment(
        self,
        rolling: RollingTribute | None,
        active_contracts: list[DebtContract],
        now: dt.datetime,
    ) -> tuple[Decimal | None, dt.datetime | None]:
        """Return (amount, due_at_utc_naive) for the earliest upcoming payment, or (None, None)."""
        candidates: list[tuple[dt.datetime, Decimal]] = []

        if rolling is not None and not rolling.paused and Decimal(str(rolling.amount)) != 0:
            deadline = current_cycle_deadline(rolling, now)
            candidates.append((deadline, Decimal(str(rolling.amount))))

        for c in active_contracts:
            if c.signed_at is None:
                continue
            due = next_period_due(c, now)
            if due is not None:
                candidates.append((due, Decimal(str(c.minimum_payment))))

        if not candidates:
            return None, None

        candidates.sort(key=lambda x: x[0])
        earliest_due, earliest_amount = candidates[0]
        return earliest_amount, earliest_due
