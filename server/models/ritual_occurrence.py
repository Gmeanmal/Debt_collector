import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, Date, ForeignKey, Text, UniqueConstraint
from sqlmodel import Field, SQLModel


class OccurrenceStatus(StrEnum):
    pending = "pending"
    completed = "completed"
    missed = "missed"
    rejected = "rejected"
    submitted = "submitted"


class RitualOccurrence(SQLModel, table=True):
    __tablename__ = "ritual_occurrence"
    __table_args__ = (
        UniqueConstraint("ritual_id", "date", name="uq_ritual_occurrence_ritual_date"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    ritual_id: UUID = Field(
        sa_column=Column(
            ForeignKey("ritual.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    # Denormalised to speed per-sub queries without joining ritual every time.
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
    # Europe/London calendar date — stored as SQL DATE, no timezone component.
    date: datetime.date = Field(sa_column=Column(Date, nullable=False))
    status: OccurrenceStatus = Field(
        default=OccurrenceStatus.pending,
        nullable=False,
        index=True,
    )
    # Nullable now; B4 adds the sub_photo table and wires this FK later.
    evidence_photo_id: UUID | None = Field(default=None, nullable=True)
    # Optional text note from the sub when completing/submitting.
    note: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    # Optional R2 object key for evidence; B4 wires the actual upload.
    evidence_r2_key: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    completed_at: datetime.datetime | None = Field(default=None, nullable=True)
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
