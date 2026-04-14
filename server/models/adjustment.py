from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Numeric
from sqlmodel import Field, SQLModel


class AdjustmentStatus(StrEnum):
    applied = "applied"
    pending_sub_approval = "pending_sub_approval"
    accepted = "accepted"
    refused = "refused"


class ContractAdjustment(SQLModel, table=True):
    __tablename__ = "contract_adjustment"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    contract_id: UUID = Field(
        sa_column=Column(
            ForeignKey("debt_contract.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    proposed_by: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="RESTRICT"),
            nullable=False,
        )
    )
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    reason: str | None = Field(default=None, nullable=True)
    status: AdjustmentStatus = Field(nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    resolved_at: datetime | None = Field(default=None, nullable=True)
