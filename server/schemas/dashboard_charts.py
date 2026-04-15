import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from models.payment_method import PaymentMethodType


class MonthlyRevenueBucket(BaseModel):
    month: str = Field(
        ...,
        description="ISO month label YYYY-MM (Europe/London calendar month)",
        examples=["2026-04"],
    )
    rolling: Decimal = Field(
        ...,
        description="Sum of validated rolling tribute payments in this month (GBP)",
        examples=["150.00"],
    )
    one_off: Decimal = Field(
        ...,
        description=(
            "Sum of validated one-off tribute / entry / profile_change_fee payments (GBP)"
        ),
        examples=["50.00"],
    )
    contract: Decimal = Field(
        ...,
        description=(
            "Sum of validated contract payments (weekly_debt + debt_payment + buyout) (GBP)"
        ),
        examples=["200.00"],
    )


class MethodBreakdownItem(BaseModel):
    method_type: PaymentMethodType = Field(
        ...,
        description="Payment method type key",
        examples=["paypal"],
    )
    total: Decimal = Field(
        ...,
        description="Sum of validated payments via this method (GBP)",
        examples=["300.00"],
    )
    count: int = Field(
        ...,
        description="Number of validated declarations via this method",
        examples=[5],
    )


class SubStatusCount(BaseModel):
    status: str = Field(
        ...,
        description="User status value",
        examples=["active"],
    )
    rolling_count: int = Field(
        ...,
        description="Number of subs with this status who have an active rolling tribute",
        examples=[3],
    )
    contract_count: int = Field(
        ...,
        description="Number of subs with this status who have an active contract",
        examples=[2],
    )


class TopSubRevenue(BaseModel):
    display_name: str = Field(
        ...,
        description="Sub display name (first + last or username fallback)",
        examples=["John D."],
    )
    username: str = Field(
        ...,
        description="Sub username",
        examples=["johnd"],
    )
    total: Decimal = Field(
        ...,
        description="Sum of all validated payment allocations by this sub (GBP)",
        examples=["750.00"],
    )


class DailyLateCount(BaseModel):
    date: datetime.date = Field(
        ...,
        description="Europe/London calendar date",
        examples=["2026-04-15"],
    )
    count: int = Field(
        ...,
        description="Number of distinct subs with at least one late obligation on this date",
        examples=[2],
    )


class ContractStateCount(BaseModel):
    active: int = Field(
        ...,
        description="Number of active contracts",
        examples=[4],
    )
    completed: int = Field(
        ...,
        description="Number of completed contracts",
        examples=[1],
    )
    breached: int = Field(
        ...,
        description="Number of breached contracts",
        examples=[1],
    )


class DashboardChartsOut(BaseModel):
    monthly_revenue: list[MonthlyRevenueBucket] = Field(
        default_factory=list,
        description=(
            "Last 12 calendar months of revenue split by type (oldest first). "
            "Each bucket is a Europe/London calendar month."
        ),
    )
    method_breakdown: list[MethodBreakdownItem] = Field(
        default_factory=list,
        description=(
            "Validated payment volume grouped by payment method type (all time). "
            "Ordered by total descending."
        ),
    )
    subs_by_status: list[SubStatusCount] = Field(
        default_factory=list,
        description=(
            "Sub counts grouped by user status, with rolling/contract splits. "
            "All known statuses are included (zero-filled where absent)."
        ),
    )
    top_subs: list[TopSubRevenue] = Field(
        default_factory=list,
        description="Top 5 subs by total validated payment volume (all time), sorted descending.",
    )
    daily_late_counts: list[DailyLateCount] = Field(
        default_factory=list,
        description=(
            "For each of the last 30 Europe/London calendar days, the number of distinct "
            "subs who were late on a rolling tribute on that day. Oldest first."
        ),
    )
    contract_states: ContractStateCount = Field(
        ...,
        description="Current counts of active / completed / breached contracts.",
    )
