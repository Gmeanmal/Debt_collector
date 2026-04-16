import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Text
from sqlmodel import Field, SQLModel


class TaskStatus(StrEnum):
    open = "open"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class Task(SQLModel, table=True):
    __tablename__ = "task"

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
            ForeignKey("goddess.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    title: str = Field(sa_column=Column(Text, nullable=False))
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    due_at: datetime.datetime | None = Field(default=None, nullable=True)
    points_on_complete: int = Field(default=1, nullable=False)
    points_on_miss: int = Field(default=-1, nullable=False)
    status: TaskStatus = Field(default=TaskStatus.open, nullable=False, index=True)
    evidence_r2_key: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    note: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    rejection_reason: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    submitted_at: datetime.datetime | None = Field(default=None, nullable=True)
    reviewed_at: datetime.datetime | None = Field(default=None, nullable=True)
    reviewed_by: UUID | None = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
        nullable=False,
    )
