from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Index, Numeric, Text, UniqueConstraint
from sqlmodel import Field, SQLModel


class EventType(StrEnum):
    period_interest = "period_interest"
    late_penalty = "late_penalty"
    payment_applied = "payment_applied"
    adjustment = "adjustment"
    surprise_penalty = "surprise_penalty"
    buyout_paid = "buyout_paid"


class DebtEvent(SQLModel, table=True):
    __tablename__ = "debt_event"
    __table_args__ = (
        UniqueConstraint(
            "contract_id", "period_index", "event_type", name="uq_debt_event_period_bound"
        ),
        Index("ix_debt_event_contract_created", "contract_id", "created_at"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    contract_id: UUID = Field(
        sa_column=Column(
            ForeignKey("debt_contract.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    event_type: EventType = Field(nullable=False)
    amount: Decimal = Field(sa_column=Column(Numeric(12, 4), nullable=False))
    period_index: int | None = Field(default=None, nullable=True)
    note: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
