from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from models.adjustment import AdjustmentStatus


class SurprisePenaltyIn(BaseModel):
    amount: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Flat penalty amount to add to the contract balance (GBP)",
        examples=["100.00"],
    )
    reason: str | None = Field(
        default=None,
        description="Optional reason note recorded on the ledger event",
        examples=["late to session"],
    )


class AdjustmentCreateIn(BaseModel):
    amount: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Balance delta to add to the contract (GBP)",
        examples=["50.00"],
    )
    reason: str | None = Field(
        default=None,
        description="Optional reason note",
        examples=["extra tribute bundled into debt"],
    )


class ContractAdjustmentOut(BaseModel):
    id: UUID = Field(..., description="Adjustment UUID")
    contract_id: UUID = Field(..., description="Parent contract UUID")
    proposed_by: UUID = Field(..., description="UUID of the user who proposed the adjustment")
    amount: Decimal = Field(..., description="Adjustment amount (GBP)", examples=["50.00"])
    reason: str | None = Field(default=None, description="Optional reason note")
    status: AdjustmentStatus = Field(..., description="Adjustment lifecycle status")
    created_at: datetime = Field(..., description="UTC datetime of creation")
    updated_at: datetime = Field(..., description="UTC datetime of last update")
    resolved_at: datetime | None = Field(
        default=None, description="UTC datetime when accepted/refused/applied"
    )

    model_config = {"from_attributes": True}
