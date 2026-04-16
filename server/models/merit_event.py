import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Index, Text
from sqlmodel import Field, SQLModel


class MeritSourceKind(StrEnum):
    ritual_complete = "ritual_complete"
    ritual_miss = "ritual_miss"
    task_complete = "task_complete"
    task_miss = "task_miss"
    manual = "manual"


class MeritEvent(SQLModel, table=True):
    __tablename__ = "merit_event"
    __table_args__ = (
        # Partial unique index: one credit per (source_kind, source_id) when source_id is set.
        # Manual credits (source_id NULL) are exempt so goddess can grant multiple manual events.
        Index(
            "uq_merit_event_source",
            "source_kind",
            "source_id",
            unique=True,
            postgresql_where="source_id IS NOT NULL",
        ),
    )

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
    source_kind: MeritSourceKind = Field(nullable=False, index=True)
    # Nullable for manual credits; points at the occurrence or task that triggered this event.
    source_id: UUID | None = Field(default=None, nullable=True, index=True)
    # Positive for credits, negative for debits.
    delta: int = Field(nullable=False)
    note: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    created_at: datetime.datetime = Field(
        default_factory=lambda: datetime.datetime.now(datetime.UTC).replace(tzinfo=None),
        nullable=False,
        index=True,
    )
