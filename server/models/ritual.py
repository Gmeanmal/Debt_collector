import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Text, Time
from sqlmodel import Field, SQLModel


class RitualFrequency(StrEnum):
    daily = "daily"
    weekly = "weekly"
    custom = "custom"


class Ritual(SQLModel, table=True):
    __tablename__ = "ritual"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    sub_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    goddess_id: UUID = Field(
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    title: str = Field(sa_column=Column(Text, nullable=False))
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    frequency: RitualFrequency = Field(nullable=False)
    # Bitmask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64.
    # Required when frequency=custom; NULL otherwise.
    custom_days_bitmask: int | None = Field(default=None, nullable=True)
    # Wall-clock deadline in Europe/London; stored as SQL TIME, default 23:59.
    deadline_time: datetime.time | None = Field(
        default=datetime.time(23, 59),
        sa_column=Column(Time, nullable=True),
    )
    points_on_complete: int = Field(default=1, nullable=False)
    points_on_miss: int = Field(default=-1, nullable=False)
    paused: bool = Field(default=False, nullable=False)
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
        nullable=False,
    )
