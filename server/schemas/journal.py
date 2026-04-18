from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from models.journal_entry import JournalMood

ALLOWED_ATTACHMENT_MIMES: frozenset[str] = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "audio/mpeg",
        "audio/ogg",
        "audio/webm",
    }
)
MAX_ATTACHMENT_BYTES: int = 10 * 1024 * 1024  # 10 MB


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
    is_private: bool = Field(
        default=False,
        description="When true the entry is hidden from the goddess.",
        examples=[False],
    )
    photo_r2_key: str | None = Field(
        default=None,
        description="Deprecated — use the multipart attachment upload instead.",
        examples=[None],
    )


class JournalEntryOut(BaseModel):
    id: UUID = Field(..., description="Journal entry identifier.")
    sub_id: UUID = Field(..., description="Author sub's user id.")
    goddess_id: UUID = Field(..., description="Goddess this entry belongs to.")
    body: str = Field(..., description="Entry body.")
    mood: JournalMood = Field(..., description="Mood tag.")
    photo_r2_key: str | None = Field(
        default=None, description="Deprecated R2 key, kept for compatibility."
    )
    attachment_key: str | None = Field(
        default=None, description="Internal storage key — not exposed to client."
    )
    attachment_mime: str | None = Field(
        default=None, description="MIME type of the attachment, if any."
    )
    attachment_presigned_url: str | None = Field(
        default=None,
        description=(
            "Short-lived presigned GET URL for the attachment. Derived on read — never stored."
        ),
    )
    is_private: bool = Field(
        default=False,
        description="Whether the entry is hidden from the goddess.",
    )
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
