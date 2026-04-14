from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from models.debt import (
    DebtContract,
    DebtContractStatus,
    InterestPeriod,
    LatePenaltySeverity,
    MidContractAdditionMode,
    PaymentFrequency,
)


def make_contract(
    *,
    principal: Decimal = Decimal("500.00"),
    interest_rate: Decimal = Decimal("0.20"),
    interest_period: InterestPeriod = InterestPeriod.monthly,
    duration_periods: int = 12,
    payment_frequency: PaymentFrequency = PaymentFrequency.monthly,
    minimum_payment: Decimal = Decimal("50.00"),
    exit_amount: Decimal = Decimal("0.00"),
    signed_at: datetime | None = None,
    sub_id: UUID | None = None,
    goddess_id: UUID | None = None,
) -> DebtContract:
    return DebtContract(
        sub_id=sub_id or uuid4(),
        goddess_id=goddess_id or uuid4(),
        principal=principal,
        interest_rate=interest_rate,
        interest_period=interest_period,
        duration_periods=duration_periods,
        payment_frequency=payment_frequency,
        minimum_payment=minimum_payment,
        late_penalty_severity=LatePenaltySeverity.light,
        late_penalty_percent=Decimal("0.05"),
        mid_contract_addition_mode=MidContractAdditionMode.disabled,
        exit_amount=exit_amount,
        status=DebtContractStatus.active,
        balance=principal,
        signed_at=signed_at,
        created_at=datetime.now(UTC).replace(tzinfo=None),
        updated_at=datetime.now(UTC).replace(tzinfo=None),
    )
