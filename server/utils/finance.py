from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from models.debt import DebtContract, InterestPeriod, PaymentFrequency

_TWO_DP = Decimal("0.01")
_TEN_DP = Decimal("0.0000000001")

_PERIOD_FACTOR: dict[PaymentFrequency, Decimal] = {
    PaymentFrequency.weekly: Decimal("12") / Decimal("52"),
    PaymentFrequency.biweekly: Decimal("12") / Decimal("26"),
    PaymentFrequency.monthly: Decimal("1"),
}

_MAX_ITERATIONS = 520


def monthly_rate(contract: DebtContract) -> Decimal:
    """Return the effective monthly interest rate for the contract."""
    r = contract.interest_rate
    if contract.interest_period == InterestPeriod.monthly:
        return r
    # Yearly AER → monthly: (1 + r_year)^(1/12) − 1
    # float used only for the fractional exponent; result cast back to Decimal.
    raw = (1.0 + float(r)) ** (1.0 / 12.0) - 1.0
    return Decimal(str(raw)).quantize(_TEN_DP, rounding=ROUND_HALF_UP)


def period_rate(contract: DebtContract) -> Decimal:
    """Return the effective interest rate for one payment period."""
    return monthly_rate(contract) * _PERIOD_FACTOR[contract.payment_frequency]


def simulate(contract: DebtContract) -> list[dict[str, Any]]:
    """Return a period-by-period balance projection assuming minimum payment each period.

    Assumes no late fees, no penalties, and no mid-contract adjustments.
    Each entry contains: period, balance_before_payment, payment, balance_end.
    All monetary values are strings quantized to 2 decimal places.
    """
    r = period_rate(contract)
    balance = contract.principal
    min_payment = contract.minimum_payment
    cap = min(contract.duration_periods, _MAX_ITERATIONS)
    out: list[dict[str, Any]] = []

    for i in range(1, cap + 1):
        balance_after_interest = (balance * (Decimal("1") + r)).quantize(
            _TWO_DP, rounding=ROUND_HALF_UP
        )
        payment = min(min_payment, balance_after_interest)
        balance_end = (balance_after_interest - payment).quantize(_TWO_DP, rounding=ROUND_HALF_UP)
        out.append(
            {
                "period": i,
                "balance_before_payment": str(balance_after_interest),
                "payment": str(payment),
                "balance_end": str(balance_end),
            }
        )
        if balance_end <= Decimal("0"):
            break
        balance = balance_end

    return out


def exit_due(contract: DebtContract, elapsed_periods: int) -> Decimal:
    """Return the buyout amount owed after elapsed_periods payment periods.

    Prorates exit_amount linearly over duration_periods.
    Clamps result to [0, exit_amount].
    """
    if contract.duration_periods == 0:
        return Decimal("0")
    if elapsed_periods <= 0:
        return Decimal("0")
    if elapsed_periods >= contract.duration_periods:
        return contract.exit_amount.quantize(_TWO_DP, rounding=ROUND_HALF_UP)
    due = contract.exit_amount * Decimal(elapsed_periods) / Decimal(contract.duration_periods)
    return due.quantize(_TWO_DP, rounding=ROUND_HALF_UP)


def severe_warning(contract: DebtContract) -> bool:
    """Return True if interest accrues faster than the minimum payment can cover it.

    Implements the spec §6.5 test: period_rate * balance > minimum_payment.
    """
    return period_rate(contract) * contract.principal > contract.minimum_payment
