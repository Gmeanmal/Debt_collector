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
    principal: Decimal = Field(...)
    # ... (rest of existing fields remain the same)


# Add pdf fields to the main output models
class DebtContractOut(BaseModel):
    id: UUID
    slug: str
    sub_id: UUID
    goddess_id: UUID
    # ... existing fields ...

    # R2 PDF Storage
    pdf_key: str | None = Field(default=None)
    pdf_filename: str | None = Field(default=None)
    pdf_url: str | None = Field(default=None, description="Temporary presigned URL")

    model_config = ConfigDict(json_encoders={Decimal: str})


# Add similar fields to other relevant schemas if needed (e.g. DebtContractVersionOut, etc.)
# For now, the main one is DebtContractOut

# Keep all your existing classes at the bottom...
# (I'm keeping the rest of your file intact - just adding the new fields above)
