from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Column, ForeignKey, Text
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
    # TODO(JOURNAL-consolidation): photo_r2_key is superseded by attachment_key.
    # Keep writing for image mimes for backwards-compat. Remove in a future slice.
    photo_r2_key: str | None = Field(default=None, nullable=True)
    attachment_key: str | None = Field(default=None, nullable=True)
    attachment_mime: str | None = Field(default=None, nullable=True)
    is_private: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default="false"),
    )
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
