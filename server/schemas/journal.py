from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from models.journal_entry import JournalMood


class JournalEntryIn(BaseModel):
    body: str = Field(
        ...,
        min_length=1,
        description="Free-form journal body. Immutable once submitted.",
        examples=["Rough day at work but the morning ritual kept me grounded."],
    )
    mood: JournalMood = Field(
        ...,
        description="Mood tag selected at time of writing.",
        examples=["neutral"],
    )
    photo_r2_key: str | None = Field(
        default=None,
        description="Optional R2 object key for an attached photo.",
        examples=["journal/2026/04/abc123.jpg"],
    )


class JournalEntryOut(BaseModel):
    id: UUID = Field(..., description="Journal entry identifier.")
    sub_id: UUID = Field(..., description="Author sub's user id.")
    goddess_id: UUID = Field(..., description="Goddess this entry belongs to.")
    body: str = Field(..., description="Entry body.")
    mood: JournalMood = Field(..., description="Mood tag.")
    photo_r2_key: str | None = Field(default=None, description="R2 key for attached photo, if any.")
    created_at: datetime = Field(..., description="UTC creation timestamp.")
    read_by_goddess_at: datetime | None = Field(
        default=None,
        description="UTC timestamp at which the goddess first saw this entry.",
    )
    goddess_comment: str | None = Field(
        default=None,
        description="Optional comment left by the goddess.",
    )
    goddess_comment_at: datetime | None = Field(
        default=None,
        description="UTC timestamp of the last comment write.",
    )

    model_config = {"from_attributes": True}


class JournalCommentIn(BaseModel):
    comment: str = Field(
        ...,
        min_length=1,
        description="Goddess comment to attach to the entry. Replaces any prior comment.",
        examples=["Proud of you for naming this. We'll unpack it together."],
    )
