"""Deterministic date/datetime series generators anchored to FROZEN_TODAY.

All functions are pure — no side effects, no datetime.now() calls.
Caller converts date → datetime by combining with a fixed time before
storing UTC values.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

_LONDON = ZoneInfo("Europe/London")
_FREEZE_TIME = time(12, 0)  # 12:00 Europe/London on FROZEN_TODAY


def frozen_now(anchor: date) -> datetime:
    """Return FROZEN_TODAY at 12:00 Europe/London expressed as naive UTC."""
    local = datetime.combine(anchor, _FREEZE_TIME, tzinfo=_LONDON)
    return local.astimezone(UTC).replace(tzinfo=None)


def frozen_dt(d: date, t: time = time(9, 0)) -> datetime:
    """Combine a date + wall-clock London time into a naive UTC datetime."""
    local = datetime.combine(d, t, tzinfo=_LONDON)
    return local.astimezone(UTC).replace(tzinfo=None)


def mondays_before(anchor: date, count: int) -> list[date]:
    """Return `count` Mondays ending on or before `anchor`, most recent last."""
    # Walk backward to find the most recent Monday.
    cursor = anchor - timedelta(days=anchor.weekday())  # this week's Monday
    if cursor > anchor:
        cursor -= timedelta(weeks=1)
    dates: list[date] = []
    while len(dates) < count:
        dates.append(cursor)
        cursor -= timedelta(weeks=1)
    dates.reverse()
    return dates


def irregular_dates(
    anchor: date,
    count: int,
    *,
    min_gap: int = 7,
    max_gap: int = 21,
    seed_offsets: list[int] | None = None,
) -> list[date]:
    """Return `count` deterministic irregular dates before `anchor`.

    `seed_offsets` lets callers provide fixed gaps (days) so the output is
    100 % reproducible without a random seed.  If omitted, a hardcoded default
    pattern is used.
    """
    if seed_offsets is None:
        # Pattern: alternates between short and long gaps, deterministic.
        base = [min_gap, max_gap, min_gap + 4, max_gap - 3, min_gap + 2, max_gap - 5]
        seed_offsets = [base[i % len(base)] for i in range(count)]

    dates: list[date] = []
    cursor = anchor
    for gap in reversed(seed_offsets[:count]):
        cursor -= timedelta(days=gap)
        dates.append(cursor)
    dates.reverse()
    return dates


def chris_rolling_dates(anchor: date) -> list[date]:
    """22 consecutive Mondays ending before anchor (Chris pays every Monday)."""
    return mondays_before(anchor - timedelta(days=1), 22)


def dan_rolling_dates(anchor: date) -> list[date]:
    """14 irregular rolling dates for Dan, spread over ~20 weeks."""
    offsets = [9, 14, 8, 21, 7, 18, 10, 14, 7, 16, 8, 14, 9, 11]
    return irregular_dates(anchor - timedelta(days=4), 14, seed_offsets=offsets)


def ben_rolling_dates(anchor: date) -> list[date]:
    """8 irregular rolling dates for Ben with 2–3 week gaps.

    Ben's last payment is 7 days before anchor — i.e. he is currently late.
    """
    # Last paid 7 days ago; gaps of ~14–21 days before that.
    offsets = [21, 14, 21, 18, 14, 21, 14, 7]
    return irregular_dates(anchor, 8, seed_offsets=offsets)


def chris_journal_dates(anchor: date) -> list[date]:
    """12 journal dates spread over ≥ 8 weeks, no two on the same day."""
    offsets = [180, 164, 150, 137, 121, 109, 94, 82, 67, 51, 34, 18]
    return [anchor - timedelta(days=d) for d in sorted(offsets, reverse=True)]


def dan_journal_dates(anchor: date) -> list[date]:
    """6 sporadic journal dates for Dan spread over ≥ 8 weeks."""
    offsets = [155, 130, 105, 82, 55, 28]
    return [anchor - timedelta(days=d) for d in sorted(offsets, reverse=True)]


def ben_journal_dates(anchor: date) -> list[date]:
    """9 journal dates for Ben, moderate frequency."""
    offsets = [170, 148, 127, 108, 90, 73, 57, 38, 19]
    return [anchor - timedelta(days=d) for d in sorted(offsets, reverse=True)]


def eli_journal_dates(anchor: date) -> list[date]:
    """4 journal dates for Eli, all before the blacklist date."""
    offsets = [135, 110, 90, 70]
    return [anchor - timedelta(days=d) for d in sorted(offsets, reverse=True)]


def photo_upload_dates(anchor: date, count: int, base_offset: int = 60) -> list[date]:
    """At least 4 distinct upload dates, spread backward from anchor."""
    step = base_offset // count
    return [anchor - timedelta(days=base_offset - i * step) for i in range(count)]


def contract_signed_dt(signed_date: date) -> datetime:
    """Standard signing time: 14:00 London on the given date."""
    return frozen_dt(signed_date, time(14, 0))


def contract_closed_dt(closed_date: date) -> datetime:
    """Standard closure time: 10:00 London on the given date."""
    return frozen_dt(closed_date, time(10, 0))
