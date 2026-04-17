import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from models.debt import DebtContractStatus
from schemas.payment import PaymentOut


class DashboardSummary(BaseModel):
    """Aggregated KPI counters for the goddess dashboard and welcome tiles."""

    subs_active: int = Field(
        ...,
        description="Users with role=sub and status=active.",
        examples=[3],
    )
    subs_paused: int = Field(
        ...,
        description=(
            "Users with role=sub and status=paused. Always 0 in the current schema "
            "because UserStatus has no paused value; reserved for future use."
        ),
        examples=[0],
    )
    contracts_active: int = Field(
        ...,
        description=(
            "Debt contracts with status=active. Only active (signed + running) contracts "
            "are counted; pending, closed, breached, completed, and cancelled ones are excluded."
        ),
        examples=[2],
    )
    contracts_closed: int = Field(
        ...,
        description="Debt contracts with status=closed.",
        examples=[1],
    )
    invitations_active: int = Field(
        ...,
        description=(
            "Invitations that have not been used and have not yet expired "
            "(used_at IS NULL AND expires_at > now)."
        ),
        examples=[2],
    )
    invitations_consumed: int = Field(
        ...,
        description="Invitations that were consumed by a sub (used_by_user_id IS NOT NULL).",
        examples=[4],
    )
    validations_pending: int = Field(
        ...,
        description="Payment declarations with status=pending (awaiting goddess validation).",
        examples=[1],
    )
    validations_oldest_age_h: int = Field(
        ...,
        description=(
            "Hours elapsed since the oldest pending-validation payment was declared, "
            "floored to the nearest whole hour. 0 when no payments are pending validation."
        ),
        examples=[6],
    )
    late_rolling_count: int = Field(
        ...,
        description=(
            "Number of active subs whose rolling tribute is currently late "
            "(days_late > 0, tribute not paused, amount > 0)."
        ),
        examples=[1],
    )
    late_contract_count: int = Field(
        ...,
        description=(
            "Number of active debt contracts where the current period payment has not been "
            "applied and the period deadline has passed (on-track=false)."
        ),
        examples=[0],
    )
    photo_queue_count: int = Field(
        ...,
        description="Sub photos with status=pending (awaiting goddess review).",
        examples=[3],
    )
    profile_change_requests_count: int = Field(
        ...,
        description="Profile change requests with status=pending.",
        examples=[0],
    )


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
    next_period_due_at: datetime.datetime | None = Field(
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


class WeeklyPaymentTotal(BaseModel):
    week_start: datetime.date = Field(
        ...,
        description="ISO date of the Monday starting this week",
        examples=["2026-04-07"],
    )
    total: Decimal = Field(
        ...,
        description="Sum of all validated payment amounts for this week (GBP)",
        examples=[Decimal("75.00")],
    )


class UpcomingPaymentItem(BaseModel):
    date: datetime.date = Field(
        ...,
        description="Europe/London calendar date the payment is due",
        examples=["2026-04-21"],
    )
    amount: Decimal = Field(
        ...,
        description="Amount due in GBP",
        examples=[Decimal("50.00")],
    )
    kind: Literal["rolling", "contract_instalment"] = Field(
        ...,
        description="Origin of the obligation: rolling tribute or contract instalment",
        examples=["rolling"],
    )
    label: str = Field(
        ...,
        description=(
            "Human-readable description for the tooltip"
            " (e.g. 'Weekly tribute', 'Contract instalment £50/wk')"
        ),
        examples=["Weekly tribute"],
    )


class SubPlanningOut(BaseModel):
    upcoming: list[UpcomingPaymentItem] = Field(
        default_factory=list,
        description="Payment deadlines in the next 30 Europe/London calendar days, sorted by date",
    )
    weekly_history: list[WeeklyPaymentTotal] = Field(
        default_factory=list,
        description=(
            "Validated payment totals for the last 12 weeks (oldest first), "
            "each keyed by the Monday of that week"
        ),
    )
    total_paid_all_time: Decimal = Field(
        ...,
        description="Lifetime sum of all validated payments by this sub (GBP)",
        examples=[Decimal("450.00")],
    )
    total_paid_this_month: Decimal = Field(
        ...,
        description="Sum of validated payments in the current Europe/London calendar month (GBP)",
        examples=[Decimal("120.00")],
    )
    rolling_remaining_this_month: Decimal = Field(
        ...,
        description=(
            "Estimated rolling amount still owed before end of current month "
            "(0 if no active rolling tribute)"
        ),
        examples=[Decimal("50.00")],
    )
