import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Numeric, Text
from sqlmodel import Field, SQLModel


class PenaltyTrigger(StrEnum):
    contract_missed = "contract_missed"
    ritual_missed = "ritual_missed"
    rolling_late = "rolling_late"
    task_missed = "task_missed"


class PenaltyAction(StrEnum):
    notify_only = "notify_only"
    apply_points = "apply_points"
    apply_fee = "apply_fee"


class PenaltyRule(SQLModel, table=True):
    __tablename__ = "penalty_rule"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    goddess_id: UUID = Field(
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    sub_id: UUID | None = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
    )
    trigger: PenaltyTrigger = Field(nullable=False, index=True)
    action: PenaltyAction = Field(nullable=False)
    points_delta: int = Field(default=0, nullable=False)
    fee_amount: Decimal | None = Field(
        default=None,
        sa_column=Column(Numeric(12, 2), nullable=True),
    )
    cooldown_hours: int = Field(default=24, nullable=False)
    active: bool = Field(default=True, nullable=False)
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
        nullable=False,
    )


class PenaltyEvent(SQLModel, table=True):
    __tablename__ = "penalty_event"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    rule_id: UUID = Field(
        sa_column=Column(
            ForeignKey("penalty_rule.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    sub_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    goddess_id: UUID = Field(
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    trigger: PenaltyTrigger = Field(nullable=False)
    action: PenaltyAction = Field(nullable=False)
    points_delta: int = Field(default=0, nullable=False)
    source_kind: str = Field(sa_column=Column(Text, nullable=False, index=True))
    source_id: UUID | None = Field(default=None, nullable=True, index=True)
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
        nullable=False,
        index=True,
    )
