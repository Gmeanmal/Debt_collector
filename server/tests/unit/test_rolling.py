import datetime
from decimal import Decimal
from uuid import uuid4

from models.rolling import DeadlineDay, RollingTribute
from utils.rolling import amount_due, current_cycle_deadline, days_late


def _make_rolling(
    *,
    amount: float = 40.0,
    deadline_day: DeadlineDay = DeadlineDay.fri,
    deadline_time: datetime.time = datetime.time(18, 0),
    late_multiplier_per_day: Decimal | int = 1,
    paused: bool = False,
) -> RollingTribute:
    # model_construct skips validation so we can use a fractional multiplier
    return RollingTribute.model_construct(
        id=uuid4(),
        sub_id=uuid4(),
        amount=amount,
        deadline_day=deadline_day,
        deadline_time=deadline_time,
        late_multiplier_per_day=late_multiplier_per_day,
        paused=paused,
        notes=None,
        last_paid_at=None,
        created_at=datetime.datetime(2026, 1, 1),
        updated_at=datetime.datetime(2026, 1, 1),
    )


def _utc(dt: datetime.datetime) -> datetime.datetime:
    return dt


def test_current_cycle_deadline_before_today() -> None:
    rolling = _make_rolling(deadline_day=DeadlineDay.fri, deadline_time=datetime.time(18, 0))
    # Wednesday 10:00 UTC in March (GMT, no BST) → Friday same week 18:00 London = 18:00 UTC
    now = datetime.datetime(2026, 3, 4, 10, 0)  # Wed
    deadline = current_cycle_deadline(rolling, now)
    assert deadline.weekday() == 4  # Fri
    assert (deadline - now).days == 2


def test_current_cycle_deadline_after_today() -> None:
    rolling = _make_rolling(deadline_day=DeadlineDay.fri, deadline_time=datetime.time(18, 0))
    # Saturday → next Friday
    now = datetime.datetime(2026, 3, 7, 10, 0)  # Sat
    deadline = current_cycle_deadline(rolling, now)
    assert deadline.weekday() == 4
    assert 5 <= (deadline - now).days <= 7


def test_days_late_zero_when_not_past() -> None:
    rolling = _make_rolling(deadline_day=DeadlineDay.fri, deadline_time=datetime.time(18, 0))
    # Just after Friday deadline, same calendar day → zero days late
    now = datetime.datetime(2026, 3, 6, 20, 0)  # Fri 20:00 UTC, 2h past 18:00 deadline
    assert days_late(rolling, now) == 0


def test_days_late_nonzero_when_past() -> None:
    rolling = _make_rolling(deadline_day=DeadlineDay.fri, deadline_time=datetime.time(18, 0))
    # Monday after the previous Friday deadline → 3 days past last deadline
    now = datetime.datetime(2026, 3, 9, 10, 0)  # Mon
    assert days_late(rolling, now) == 3


def test_amount_due_with_late_multiplier() -> None:
    rolling = _make_rolling(
        amount=40.0,
        deadline_day=DeadlineDay.fri,
        deadline_time=datetime.time(18, 0),
        late_multiplier_per_day=Decimal("0.1"),
    )
    # 2 days past last Friday deadline → 40 * (1 + 2 * 0.1) = 48.00
    now = datetime.datetime(2026, 3, 8, 10, 0)  # Sun, 2 days past Fri 18:00 UTC
    due = amount_due(rolling, now)
    assert due == Decimal("48.00")


def test_amount_due_paused_is_zero() -> None:
    rolling = _make_rolling(amount=40.0, paused=True)
    now = datetime.datetime(2026, 3, 9, 10, 0)
    assert amount_due(rolling, now) == Decimal("0")
