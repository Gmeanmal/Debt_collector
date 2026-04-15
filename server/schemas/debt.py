from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from models.debt import (
    DebtContractEventType,
    DebtContractStatus,
    InterestPeriod,
    LatePenaltySeverity,
    MidContractAdditionMode,
    PaymentFrequency,
)


class DebtContractCreate(BaseModel):
    principal: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Starting balance of the debt in GBP",
        examples=["500.00"],
    )
    interest_rate: Decimal = Field(
        ...,
        ge=0,
        le=1,
        max_digits=8,
        decimal_places=6,
        description="Interest rate as a fraction (e.g. 0.200000 = 20%)",
        examples=["0.200000"],
    )
    interest_period: InterestPeriod = Field(
        ...,
        description="Whether the rate is monthly or yearly (yearly converted via AER)",
        examples=["monthly"],
    )
    duration_periods: int = Field(
        ...,
        ge=1,
        description="Number of payment periods for the full term",
        examples=[12],
    )
    payment_frequency: PaymentFrequency = Field(
        ...,
        description="How often payments are due",
        examples=["monthly"],
    )
    minimum_payment: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Minimum payment per period to avoid a late penalty (GBP)",
        examples=["50.00"],
    )
    late_penalty_severity: LatePenaltySeverity = Field(
        ...,
        description="UI preset describing severity of the late penalty",
        examples=["medium"],
    )
    late_penalty_percent: Decimal = Field(
        ...,
        ge=0,
        le=1,
        max_digits=5,
        decimal_places=4,
        description="Fraction added to balance when a period is missed (e.g. 0.1000 = 10%)",
        examples=["0.1000"],
    )
    dom_can_add_surprise_penalty: bool = Field(
        ...,
        description="Goddess may apply an ad-hoc penalty outside the late-penalty mechanism",
        examples=[False],
    )
    mid_contract_addition_mode: MidContractAdditionMode = Field(
        ...,
        description=(
            "Controls whether the goddess can add balance mid-contract"
            " and whether sub approval is required"
        ),
        examples=["disabled"],
    )
    exit_amount: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Reference amount for buyout formula and breach calculations (GBP)",
        examples=["600.00"],
    )


class DebtContractCounter(BaseModel):
    principal: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Proposed principal in GBP",
        examples=["450.00"],
    )
    interest_rate: Decimal = Field(
        ...,
        ge=0,
        le=1,
        max_digits=8,
        decimal_places=6,
        description="Proposed interest rate as a fraction",
        examples=["0.150000"],
    )
    interest_period: InterestPeriod = Field(
        ...,
        description="Proposed interest period",
        examples=["monthly"],
    )
    duration_periods: int = Field(
        ...,
        ge=1,
        description="Proposed number of payment periods",
        examples=[10],
    )
    payment_frequency: PaymentFrequency = Field(
        ...,
        description="Proposed payment frequency",
        examples=["monthly"],
    )
    minimum_payment: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Proposed minimum payment per period (GBP)",
        examples=["40.00"],
    )
    late_penalty_severity: LatePenaltySeverity = Field(
        ...,
        description="Proposed late penalty severity preset",
        examples=["light"],
    )
    late_penalty_percent: Decimal = Field(
        ...,
        ge=0,
        le=1,
        max_digits=5,
        decimal_places=4,
        description="Proposed late penalty fraction",
        examples=["0.0500"],
    )
    dom_can_add_surprise_penalty: bool = Field(
        ...,
        description="Proposed setting for surprise-penalty capability",
        examples=[False],
    )
    mid_contract_addition_mode: MidContractAdditionMode = Field(
        ...,
        description="Proposed mid-contract addition mode",
        examples=["sub_approval_required"],
    )
    exit_amount: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Proposed exit/buyout reference amount (GBP)",
        examples=["500.00"],
    )


class DebtContractSignIn(BaseModel):
    signature_b64: str = Field(
        ...,
        description=(
            "Sub's signature as a base64 data URI in PNG format. "
            "Must start with 'data:image/png;base64,'. "
            "The frontend is responsible for enforcing size limits before submission."
        ),
        min_length=1,
        examples=[
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        ],
    )

    @field_validator("signature_b64")
    @classmethod
    def must_be_png_data_uri(cls, v: str) -> str:
        if not v.startswith("data:image/png;base64,"):
            raise ValueError(
                "signature_b64 must be a data URI with prefix 'data:image/png;base64,'"
            )
        return v


class DebtContractVersionOut(BaseModel):
    id: UUID = Field(..., description="Version record UUID")
    contract_id: UUID = Field(..., description="Parent contract UUID")
    round_no: int = Field(..., description="0 = original proposal, 1 = counter-proposal")
    proposed_by: UUID = Field(..., description="UUID of the user who proposed this version")
    proposed_at: datetime = Field(..., description="UTC datetime when this version was proposed")
    principal: Decimal = Field(..., description="Principal in GBP", examples=["500.00"])
    interest_rate: Decimal = Field(..., description="Interest rate fraction", examples=["0.200000"])
    interest_period: InterestPeriod = Field(..., description="Interest period enum")
    duration_periods: int = Field(..., description="Number of payment periods")
    payment_frequency: PaymentFrequency = Field(..., description="Payment frequency enum")
    minimum_payment: Decimal = Field(
        ..., description="Minimum payment per period (GBP)", examples=["50.00"]
    )
    late_penalty_severity: LatePenaltySeverity = Field(
        ..., description="Late penalty severity preset"
    )
    late_penalty_percent: Decimal = Field(
        ..., description="Late penalty fraction", examples=["0.1000"]
    )
    dom_can_add_surprise_penalty: bool = Field(
        ..., description="Goddess surprise-penalty capability"
    )
    mid_contract_addition_mode: MidContractAdditionMode = Field(
        ..., description="Mid-contract addition mode"
    )
    exit_amount: Decimal = Field(
        ..., description="Exit/buyout reference amount (GBP)", examples=["600.00"]
    )

    model_config = {"from_attributes": True}


class DebtContractOut(BaseModel):
    id: UUID = Field(..., description="Contract UUID")
    sub_id: UUID = Field(..., description="Sub user UUID")
    goddess_id: UUID = Field(..., description="Goddess UUID")
    sub_initiated: bool = Field(..., description="True when the sub proposed the contract")
    principal: Decimal = Field(..., description="Starting balance (GBP)", examples=["500.00"])
    interest_rate: Decimal = Field(..., description="Interest rate fraction", examples=["0.200000"])
    interest_period: InterestPeriod = Field(..., description="Interest period enum")
    duration_periods: int = Field(..., description="Number of payment periods")
    payment_frequency: PaymentFrequency = Field(..., description="Payment frequency enum")
    minimum_payment: Decimal = Field(
        ..., description="Minimum payment per period (GBP)", examples=["50.00"]
    )
    late_penalty_severity: LatePenaltySeverity = Field(
        ..., description="Late penalty severity preset"
    )
    late_penalty_percent: Decimal = Field(
        ..., description="Late penalty fraction", examples=["0.1000"]
    )
    dom_can_add_surprise_penalty: bool = Field(
        ..., description="Goddess surprise-penalty capability"
    )
    mid_contract_addition_mode: MidContractAdditionMode = Field(
        ..., description="Mid-contract addition mode"
    )
    exit_amount: Decimal = Field(
        ..., description="Exit/buyout reference amount (GBP)", examples=["600.00"]
    )
    status: DebtContractStatus = Field(..., description="Current contract status")
    current_version: DebtContractVersionOut | None = Field(
        default=None,
        description="Expanded current negotiation version snapshot",
    )
    signed_at: datetime | None = Field(
        default=None, description="UTC datetime when the contract was signed"
    )
    balance: Decimal = Field(
        ...,
        description="Cached current balance (GBP); event log is authoritative",
        examples=["500.00"],
    )
    created_at: datetime = Field(..., description="UTC datetime of contract creation")
    updated_at: datetime = Field(..., description="UTC datetime of last update")
    total_paid: Decimal = Field(
        ...,
        description="Sum of all validated payment allocations targeting this contract (GBP)",
        examples=["150.00"],
    )
    total_due: Decimal = Field(
        ...,
        description=(
            "Agreed total amount due over the full term (minimum_payment × duration_periods, GBP)"
        ),
        examples=["600.00"],
    )
    remaining: Decimal = Field(
        ...,
        description="total_due minus total_paid, clamped to 0 (GBP)",
        examples=["450.00"],
    )
    progress_pct: float = Field(
        ...,
        description="Repayment progress as a percentage 0–100, rounded to 1 decimal place",
        examples=[25.0],
    )
    payment_count: int = Field(
        ...,
        description="Number of validated payments applied to this contract",
        examples=[3],
    )
    last_payment_at: datetime | None = Field(
        default=None,
        description="UTC datetime of the most recent validated payment, or null if none",
    )
    first_payment_at: datetime | None = Field(
        default=None,
        description="UTC datetime of the earliest validated payment, or null if none",
    )
    on_track: bool = Field(
        ...,
        description=(
            "True when total_paid meets or exceeds the expected cumulative instalment "
            "total up to today (period_index × minimum_payment). "
            "Always true for contracts that have not yet been signed."
        ),
        examples=[True],
    )

    model_config = {"from_attributes": True}


class DebtContractAuditOut(BaseModel):
    id: UUID = Field(..., description="Audit record UUID")
    contract_id: UUID = Field(..., description="Parent contract UUID")
    event_type: DebtContractEventType = Field(..., description="State-transition event type")
    actor_id: UUID = Field(..., description="UUID of the user who triggered the transition")
    from_status: DebtContractStatus | None = Field(
        default=None, description="Status before the transition"
    )
    to_status: DebtContractStatus | None = Field(
        default=None, description="Status after the transition"
    )
    note: str | None = Field(default=None, description="Optional free-text note on the transition")
    created_at: datetime = Field(..., description="UTC datetime of the audit event")

    model_config = {"from_attributes": True}


class DebtSimulationPeriod(BaseModel):
    period: int = Field(..., ge=1, description="Period index (1-based)")
    balance_before_payment: Decimal = Field(
        ..., description="Balance after interest, before payment"
    )
    payment: Decimal = Field(..., description="Payment applied this period")
    balance_end: Decimal = Field(..., description="Balance after payment")

    model_config = ConfigDict(json_encoders={Decimal: str})


class DebtSimulationOut(BaseModel):
    periods: list[DebtSimulationPeriod] = Field(..., description="Period-by-period projection")
    severe_warning: bool = Field(
        ..., description="True if minimum payment cannot keep up with interest growth"
    )
    period_rate: Decimal = Field(..., description="Per-period interest rate (fraction)")
    monthly_rate: Decimal = Field(..., description="Derived monthly interest rate (fraction)")

    model_config = ConfigDict(json_encoders={Decimal: str})
