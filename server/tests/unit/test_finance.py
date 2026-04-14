from decimal import Decimal

from models.debt import InterestPeriod, PaymentFrequency
from utils.finance import (
    exit_due,
    monthly_rate,
    period_rate,
    severe_warning,
    simulate,
)

from ._factories import make_contract


def test_monthly_rate_from_yearly_aer() -> None:
    contract = make_contract(interest_rate=Decimal("0.20"), interest_period=InterestPeriod.yearly)
    m = monthly_rate(contract)
    compounded = (1 + float(m)) ** 12
    assert abs(compounded - 1.20) < 1e-6


def test_period_rate_weekly_from_monthly() -> None:
    contract = make_contract(
        interest_rate=Decimal("0.10"),
        interest_period=InterestPeriod.monthly,
        payment_frequency=PaymentFrequency.weekly,
    )
    weekly = period_rate(contract)
    # period_rate scales the monthly rate by (12/52) for weekly cadence
    expected = Decimal("0.10") * (Decimal("12") / Decimal("52"))
    assert abs(weekly - expected) < Decimal("1e-9")


def test_simulate_12_periods() -> None:
    contract = make_contract(
        principal=Decimal("500.00"),
        interest_rate=Decimal("0.20"),
        interest_period=InterestPeriod.monthly,
        duration_periods=12,
        payment_frequency=PaymentFrequency.monthly,
        minimum_payment=Decimal("50.00"),
    )
    rows = simulate(contract)
    assert len(rows) == 12
    # balance rises per period because interest (100) > min payment (50) on principal 500
    first_end = Decimal(rows[0]["balance_end"])
    second_end = Decimal(rows[1]["balance_end"])
    assert second_end > first_end
    # first period: 500 * 1.2 = 600; minus 50 -> 550
    assert first_end == Decimal("550.00")
    # sanity check monotonic rise
    ends = [Decimal(r["balance_end"]) for r in rows]
    assert ends == sorted(ends)


def test_severe_warning_true_when_interest_exceeds_min() -> None:
    contract = make_contract(
        principal=Decimal("500.00"),
        interest_rate=Decimal("0.20"),
        interest_period=InterestPeriod.monthly,
        payment_frequency=PaymentFrequency.monthly,
        minimum_payment=Decimal("50.00"),
    )
    assert severe_warning(contract) is True


def test_severe_warning_false_when_min_covers_interest() -> None:
    contract = make_contract(
        principal=Decimal("500.00"),
        interest_rate=Decimal("0.05"),
        interest_period=InterestPeriod.monthly,
        payment_frequency=PaymentFrequency.monthly,
        minimum_payment=Decimal("50.00"),
    )
    assert severe_warning(contract) is False


def test_exit_due_increases_over_time() -> None:
    contract = make_contract(
        duration_periods=10,
        exit_amount=Decimal("100.00"),
    )
    e1 = exit_due(contract, 1)
    e5 = exit_due(contract, 5)
    e10 = exit_due(contract, 10)
    assert e1 < e5 < e10
    assert e10 == Decimal("100.00")
    assert exit_due(contract, 0) == Decimal("0")
