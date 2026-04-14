import datetime

from models.debt import PaymentFrequency
from utils.periods import current_period_index

from ._factories import make_contract


def test_current_period_index_weekly() -> None:
    signed = datetime.datetime(2026, 3, 1, 12, 0)
    now = signed + datetime.timedelta(days=10)
    contract = make_contract(
        payment_frequency=PaymentFrequency.weekly,
        signed_at=signed,
    )
    assert current_period_index(contract, now) == 1


def test_current_period_index_monthly() -> None:
    signed = datetime.datetime(2026, 1, 15, 12, 0)
    now = datetime.datetime(2026, 3, 15, 12, 0)
    contract = make_contract(
        payment_frequency=PaymentFrequency.monthly,
        signed_at=signed,
    )
    assert current_period_index(contract, now) == 2
