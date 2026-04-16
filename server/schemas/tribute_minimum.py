from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from models.tribute_minimum import TributePeriod


class TributeMinimumUpsertIn(BaseModel):
    amount: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Target tribute amount in GBP for the configured period",
        examples=["200.00"],
    )
    period: TributePeriod = Field(
        ...,
        description="Recurrence window the target applies to",
        examples=["monthly"],
    )
    grace_below_percent: Decimal = Field(
        default=Decimal("0.80"),
        ge=0,
        le=1,
        max_digits=5,
        decimal_places=4,
        description=(
            "Fraction of the target below which the gauge turns red. "
            "0.80 means below 80% of target → red."
        ),
        examples=["0.8000"],
    )


class TributeMinimumOut(BaseModel):
    sub_id: UUID = Field(..., description="Sub user UUID")
    goddess_id: UUID = Field(..., description="Owning goddess UUID")
    amount: Decimal = Field(..., description="Target tribute amount in GBP", examples=["200.00"])
    period: TributePeriod = Field(..., description="Recurrence window", examples=["monthly"])
    grace_below_percent: Decimal = Field(
        ...,
        description="Red threshold as a decimal fraction (0.80 = below 80% → red)",
        examples=["0.8000"],
    )
    created_at: datetime = Field(..., description="UTC datetime when the config was created")
    updated_at: datetime = Field(..., description="UTC datetime of last update")

    model_config = {"from_attributes": True}


class TributeGaugeOut(BaseModel):
    configured: bool = Field(..., description="Whether a tribute_minimum row exists for this sub")
    target_amount: Decimal | None = Field(
        default=None,
        description="Configured target amount in GBP; null when not configured",
        examples=["200.00"],
    )
    period: TributePeriod | None = Field(
        default=None,
        description="Configured period; null when not configured",
        examples=["monthly"],
    )
    actual_this_period: Decimal = Field(
        ...,
        description="Sum of validated payment_declaration amounts for the current period",
        examples=["150.00"],
    )
    ratio: Decimal | None = Field(
        default=None,
        description="actual_this_period / target_amount; null when target is null or zero",
        examples=["0.75"],
    )
    color: str = Field(
        ...,
        description=(
            "Gauge colour. "
            "red = ratio < grace_below_percent, "
            "amber = grace_below_percent <= ratio < 1, "
            "green = ratio >= 1 or not configured"
        ),
        examples=["amber"],
    )
    period_start: datetime = Field(..., description="Inclusive UTC start of the current period")
    period_end: datetime = Field(
        ..., description="Exclusive UTC end of the current period (next period start)"
    )
