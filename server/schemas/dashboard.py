from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from models.debt import DebtContractStatus
from schemas.payment import PaymentOut


class LatePaymentItem(BaseModel):
    sub_id: UUID = Field(
        ...,
        description="UUID of the sub who is late",
        examples=["00000000-0000-0000-0000-000000000002"],
    )
    sub_display_name: str | None = Field(
        default=None,
        description="Display name of the sub (first + last, or username)",
        examples=["Jane Doe"],
    )
    kind: Literal["rolling", "contract"] = Field(
        ...,
        description="Source of the late payment — rolling tribute or debt contract",
        examples=["rolling"],
    )
    amount_due: Decimal = Field(
        ...,
        description="Amount currently owed in GBP (includes any late penalty for rolling)",
        examples=[Decimal("50.00")],
    )
    days_late: int = Field(
        ...,
        description="Number of calendar days past the deadline",
        examples=[3],
    )
    context_id: UUID = Field(
        ...,
        description="UUID of the rolling tribute or contract this item refers to",
        examples=["00000000-0000-0000-0000-000000000003"],
    )


class GoddessDashboardOut(BaseModel):
    subs_total: int = Field(
        ...,
        description="Total subs linked to this goddess (active + blacklisted)",
        examples=[5],
    )
    subs_active: int = Field(
        ...,
        description="Number of active subs",
        examples=[4],
    )
    subs_blacklisted: int = Field(
        ...,
        description="Number of blacklisted subs",
        examples=[1],
    )
    rolling_count: int = Field(
        ...,
        description="Number of rolling tributes currently not paused",
        examples=[3],
    )
    contracts_active: int = Field(
        ...,
        description="Number of active debt contracts",
        examples=[2],
    )
    pending_validations: int = Field(
        ...,
        description="Number of payment declarations pending validation",
        examples=[4],
    )
    pending_contracts: int = Field(
        ...,
        description="Number of contracts in any pending_* status",
        examples=[1],
    )
    late_payments: list[LatePaymentItem] = Field(
        default_factory=list,
        description=(
            "Up to 50 most urgent late payments (rolling + contract), "
            "sorted by days_late descending"
        ),
    )
    total_drained: Decimal = Field(
        ...,
        description="Sum of all validated payment amounts across this goddess (GBP)",
        examples=[Decimal("1250.00")],
    )


class ActiveContractSummary(BaseModel):
    id: UUID = Field(
        ...,
        description="Contract UUID",
        examples=["00000000-0000-0000-0000-000000000010"],
    )
    principal: Decimal = Field(
        ...,
        description="Original principal in GBP",
        examples=[Decimal("1000.00")],
    )
    balance: Decimal = Field(
        ...,
        description="Current outstanding balance in GBP",
        examples=[Decimal("750.00")],
    )
    progress_percent: Decimal = Field(
        ...,
        description="Paid-down percentage: (principal - balance) / principal * 100",
        examples=[Decimal("25.00")],
    )
    status: DebtContractStatus = Field(
        ...,
        description="Contract status",
        examples=["active"],
    )
    next_period_due_at: datetime | None = Field(
        default=None,
        description="UTC datetime when the next period payment is due (null if not computable)",
        examples=["2026-04-20T00:00:00"],
    )


class SubDashboardOut(BaseModel):
    amount_due_this_week: Decimal = Field(
        ...,
        description=(
            "Sum of rolling amount_due (if not paused) plus minimum_payment of all active "
            "contracts with weekly payment frequency (GBP)"
        ),
        examples=[Decimal("80.00")],
    )
    is_late: bool = Field(
        ...,
        description="True if the rolling tribute is late or any active contract is late",
        examples=[False],
    )
    active_contracts: list[ActiveContractSummary] = Field(
        default_factory=list,
        description="Summary of all active contracts belonging to this sub",
    )
    recent_payments: list[PaymentOut] = Field(
        default_factory=list,
        description="Last 10 payment declarations for this sub",
    )
    total_sent: Decimal = Field(
        ...,
        description="Sum of all validated payments by this sub (GBP)",
        examples=[Decimal("450.00")],
    )
