import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from models.rolling import RollingTribute

LONDON = ZoneInfo("Europe/London")

_DAY_INDEX: dict[str, int] = {
    "mon": 0,
    "tue": 1,
    "wed": 2,
    "thu": 3,
    "fri": 4,
    "sat": 5,
    "sun": 6,
}


def current_cycle_deadline(rolling: RollingTribute, now: datetime.datetime) -> datetime.datetime:
    """Return the deadline datetime of the current cycle as naive UTC."""
    now_uk = now.replace(tzinfo=datetime.UTC).astimezone(LONDON)
    day_target = _DAY_INDEX[rolling.deadline_day.value]
    days_until = (day_target - now_uk.weekday()) % 7
    candidate = datetime.datetime.combine(
        now_uk.date() + datetime.timedelta(days=days_until),
        rolling.deadline_time,
        LONDON,
    )
    if candidate <= now_uk:
        candidate += datetime.timedelta(days=7)
    return candidate.astimezone(datetime.UTC).replace(tzinfo=None)


def days_late(rolling: RollingTribute, now: datetime.datetime) -> int:
    """Return the number of calendar days past the last deadline (0 if on time).

    The baseline is the later of rolling creation and last paid timestamp — a
    deadline that fell before the sub was even on the hook does not count as late.
    """
    baseline = rolling.last_paid_at or rolling.created_at
    last_deadline = current_cycle_deadline(rolling, now) - datetime.timedelta(days=7)
    if last_deadline <= baseline:
        return 0
    last_deadline_uk = last_deadline.replace(tzinfo=datetime.UTC).astimezone(LONDON)
    now_uk = now.replace(tzinfo=datetime.UTC).astimezone(LONDON)
    if now_uk <= last_deadline_uk:
        return 0
    return (now_uk.date() - last_deadline_uk.date()).days


def amount_due(rolling: RollingTribute, now: datetime.datetime) -> Decimal:
    """Return the amount currently owed including late penalty."""
    if rolling.paused or rolling.amount == 0:
        return Decimal("0")
    late = days_late(rolling, now)
    base = Decimal(str(rolling.amount))
    return base * (1 + late * rolling.late_multiplier_per_day)
