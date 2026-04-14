from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from models.debt import DebtContract, PaymentFrequency

LONDON = ZoneInfo("Europe/London")


def _as_london_date(dt: datetime):
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(LONDON).date()


def current_period_index(contract: DebtContract, now: datetime) -> int:
    """Return how many full periods have elapsed since signed_at.

    0 means the contract is still inside its first period.
    """
    if contract.signed_at is None:
        return 0
    start = _as_london_date(contract.signed_at)
    current = _as_london_date(now)
    if current <= start:
        return 0
    delta_days = (current - start).days

    freq = contract.payment_frequency
    if freq == PaymentFrequency.weekly:
        return delta_days // 7
    if freq == PaymentFrequency.biweekly:
        return delta_days // 14
    if freq == PaymentFrequency.monthly:
        months = (current.year - start.year) * 12 + (current.month - start.month)
        if current.day < start.day:
            months -= 1
        return max(0, months)
    return 0
