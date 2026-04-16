"""Daily cron service for ritual occurrence lifecycle.

Two passes, both idempotent, driven by APScheduler in Europe/London:

- ``seed_occurrences_for_today`` (00:00) — inserts one pending
  ``ritual_occurrence`` per active ritual whose frequency matches the given
  London date. Idempotency comes from the ``(ritual_id, date)`` unique index
  combined with ``ON CONFLICT DO NOTHING``.
- ``mark_missed_for_today`` (23:59) — flips every still-pending occurrence
  for the given date to ``missed``. Idempotency is natural: a second run
  finds no rows in ``pending``.
"""

import datetime
from datetime import UTC
from zoneinfo import ZoneInfo

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from daos.ritual_dao import RitualDao
from daos.ritual_occurrence_dao import RitualOccurrenceDao
from models.ritual import Ritual, RitualFrequency
from models.ritual_occurrence import OccurrenceStatus

log = structlog.get_logger()

LONDON = ZoneInfo("Europe/London")


def london_today() -> datetime.date:
    """Return the current Europe/London calendar date derived from UTC now."""
    return datetime.datetime.now(UTC).astimezone(LONDON).date()


def _ritual_fires_on(ritual: Ritual, today: datetime.date) -> bool:
    weekday = today.weekday()
    if ritual.frequency == RitualFrequency.daily:
        return True
    if ritual.frequency == RitualFrequency.weekly:
        # Weekly rituals fire on the same weekday they were created, in
        # Europe/London. ``created_at`` is stored as naive UTC (see model).
        created_london = ritual.created_at.replace(tzinfo=UTC).astimezone(LONDON).date()
        return created_london.weekday() == weekday
    if ritual.frequency == RitualFrequency.custom:
        mask = ritual.custom_days_bitmask or 0
        return bool(mask & (1 << weekday))
    return False


def _row_for(ritual: Ritual, today: datetime.date) -> dict[str, object]:
    return {
        "ritual_id": ritual.id,
        "sub_id": ritual.sub_id,
        "goddess_id": ritual.goddess_id,
        "date": today,
        "status": OccurrenceStatus.pending,
    }


async def seed_occurrences_for_today(
    session: AsyncSession, today_london_date: datetime.date
) -> int:
    """Insert pending occurrences for every active ritual that fires today.

    Returns the number of rows actually inserted (duplicates count as 0
    thanks to ``ON CONFLICT DO NOTHING``).
    """
    log.info("ritual_seed_start", date=today_london_date.isoformat())
    ritual_dao = RitualDao(session)
    occurrence_dao = RitualOccurrenceDao(session)

    rituals = await ritual_dao.list_active_for_date(today_london_date)
    rows = [
        _row_for(r, today_london_date) for r in rituals if _ritual_fires_on(r, today_london_date)
    ]
    inserted = await occurrence_dao.bulk_create_for_date(rows)

    log.info(
        "ritual_seed_done",
        date=today_london_date.isoformat(),
        candidates=len(rituals),
        scheduled=len(rows),
        inserted=inserted,
    )
    return inserted


async def mark_missed_for_today(session: AsyncSession, today_london_date: datetime.date) -> int:
    """Flip every still-pending occurrence for today to ``missed``.

    Returns the number of rows updated. A second call within the same day
    returns 0 because no pending rows remain.
    """
    log.info("ritual_missed_start", date=today_london_date.isoformat())
    occurrence_dao = RitualOccurrenceDao(session)
    updated = await occurrence_dao.mark_missed_by_date(today_london_date)
    log.info(
        "ritual_missed_done",
        date=today_london_date.isoformat(),
        updated=updated,
    )
    return updated
