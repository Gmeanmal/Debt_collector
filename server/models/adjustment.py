from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Numeric, Text
from sqlmodel import Field, SQLModel


class AdjustmentStatus(StrEnum):
    applied = "applied"
    pending_sub_approval = "pending_sub_approval"
    accepted = "accepted"
    refused = "refused"


class ContractAdjustmentKind(StrEnum):
    # Goddess-initiated ad-hoc surprise penalty (dom_can_add_surprise_penalty flag required).
    surprise_penalty = "surprise_penalty"
    # Balance adjustment (dom_controlled or sub_approval_required).
    adjustment = "adjustment"


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
    # kind is nullable so existing rows (pre-migration) remain valid.
    kind: ContractAdjustmentKind | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True, index=True),
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
