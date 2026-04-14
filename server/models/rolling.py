import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Numeric, Text, Time, UniqueConstraint
from sqlmodel import Field, SQLModel


class DeadlineDay(StrEnum):
    mon = "mon"
    tue = "tue"
    wed = "wed"
    thu = "thu"
    fri = "fri"
    sat = "sat"
    sun = "sun"


class RollingTribute(SQLModel, table=True):
    __tablename__ = "rolling_tribute"
    __table_args__ = (UniqueConstraint("sub_id", name="uq_rolling_tribute_sub_id"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    sub_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    amount: float = Field(
        default=0,
        sa_column=Column(Numeric(12, 2), nullable=False),
    )
    deadline_day: DeadlineDay = Field(nullable=False)
    deadline_time: datetime.time = Field(
        sa_column=Column(Time, nullable=False),
    )
    late_multiplier_per_day: int = Field(default=1, nullable=False)
    paused: bool = Field(default=False, nullable=False)
    notes: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    last_paid_at: datetime.datetime | None = Field(default=None, nullable=True)
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
        nullable=False,
    )
