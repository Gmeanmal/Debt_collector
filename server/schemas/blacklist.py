from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class BreachIn(BaseModel):
    reason: str | None = Field(
        default=None,
        description="Optional free-text reason for the breach",
        examples=["missed three consecutive payments"],
    )


class ForgiveIn(BaseModel):
    reinstatement_fee_paid: Decimal = Field(
        ...,
        ge=0,
        max_digits=12,
        decimal_places=2,
        description="Reinstatement fee paid by the sub to be removed from blacklist (GBP)",
        examples=["100.00"],
    )


class BlacklistEntryOut(BaseModel):
    id: UUID = Field(..., description="Blacklist entry UUID")
    goddess_id: UUID = Field(..., description="Goddess UUID")
    sub_id: UUID = Field(..., description="Blacklisted sub UUID")
    reason: str | None = Field(default=None, description="Reason for the breach")
    balance_snapshot: Decimal = Field(
        ...,
        description="Sum of active-contract balances at the time of breach (GBP)",
        examples=["1500.00"],
    )
    reinstatement_fee_paid: Decimal | None = Field(
        default=None,
        description="Fee paid by the sub to be forgiven (GBP); null if not yet forgiven",
        examples=["100.00"],
    )
    breached_at: datetime = Field(..., description="UTC datetime of breach")
    forgiven_at: datetime | None = Field(
        default=None, description="UTC datetime of forgiveness, if any"
    )
    created_at: datetime = Field(..., description="UTC datetime of record creation")

    model_config = {"from_attributes": True}
