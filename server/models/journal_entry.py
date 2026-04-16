from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Text
from sqlmodel import Field, SQLModel


class JournalMood(StrEnum):
    great = "great"
    good = "good"
    neutral = "neutral"
    low = "low"
    bad = "bad"
    numb = "numb"
    overwhelmed = "overwhelmed"


class JournalEntry(SQLModel, table=True):
    """Journal entry submitted by a sub.

    Immutable after creation. Only `read_by_goddess_at`, `goddess_comment`,
    `goddess_comment_at` may be mutated. Enforced via DAO — no `update_body`
    method exists.
    """

    __tablename__ = "journal_entry"

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
    body: str = Field(sa_column=Column(Text, nullable=False))
    mood: JournalMood = Field(nullable=False)
    photo_r2_key: str | None = Field(default=None, nullable=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    read_by_goddess_at: datetime | None = Field(default=None, nullable=True)
    goddess_comment: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    goddess_comment_at: datetime | None = Field(default=None, nullable=True)
