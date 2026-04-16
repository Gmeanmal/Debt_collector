from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Numeric
from sqlmodel import Field, SQLModel


class TributePeriod(StrEnum):
    weekly = "weekly"
    monthly = "monthly"


class TributeMinimum(SQLModel, table=True):
    __tablename__ = "tribute_minimum"

    sub_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        )
    )
    goddess_id: UUID = Field(
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    period: TributePeriod = Field(nullable=False)
    grace_below_percent: Decimal = Field(
        default=Decimal("0.80"),
        sa_column=Column(Numeric(5, 4), nullable=False, server_default="0.8000"),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
