import datetime as dt
from decimal import Decimal

from models.debt import DebtContract, PaymentFrequency
from models.user import User
from utils.periods import current_period_index

_LONDON = None  # imported locally where needed — ZoneInfo is not serialisable here


def now_utc() -> dt.datetime:
    """Return the current UTC timestamp as a tz-naive datetime (DB storage convention)."""
    return dt.datetime.now(dt.UTC).replace(tzinfo=None)


def display_name(user: User) -> str | None:
    parts = [p for p in (user.first_name, user.last_name) if p]
    if parts:
        return " ".join(parts)
    return user.username


def period_length_days(freq: PaymentFrequency) -> int:
    if freq == PaymentFrequency.weekly:
        return 7
    if freq == PaymentFrequency.biweekly:
        return 14
    return 30


def period_start(contract: DebtContract, now: dt.datetime) -> dt.datetime | None:
    if contract.signed_at is None:
        return None
    idx = current_period_index(contract, now)
    period_len = period_length_days(contract.payment_frequency)
    return contract.signed_at + dt.timedelta(days=idx * period_len)


def next_period_due(contract: DebtContract, now: dt.datetime) -> dt.datetime | None:
    if contract.signed_at is None:
        return None
    start = period_start(contract, now)
    if start is None:
        return None
    return start + dt.timedelta(days=period_length_days(contract.payment_frequency))


def progress_percent(principal: Decimal, balance: Decimal) -> Decimal:
    if principal <= 0:
        return Decimal("0.00")
    paid = Decimal(str(principal)) - Decimal(str(balance))
    pct = (paid / Decimal(str(principal))) * Decimal("100")
    if pct < 0:
        pct = Decimal("0")
    if pct > Decimal("100"):
        pct = Decimal("100")
    return pct.quantize(Decimal("0.01"))
