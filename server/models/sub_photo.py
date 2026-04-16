from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class SubPhotoStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class SubPhoto(SQLModel, table=True):
    __tablename__ = "sub_photo"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    sub_id: UUID = Field(foreign_key="user.id", index=True, nullable=False)
    goddess_id: UUID = Field(foreign_key="goddess.id", index=True, nullable=False)
    r2_key: str = Field(nullable=False, description="Object-store key (provider-agnostic naming).")
    mime_type: str = Field(nullable=False)
    byte_size: int = Field(nullable=False)
    status: SubPhotoStatus = Field(
        default=SubPhotoStatus.pending,
        index=True,
        nullable=False,
    )
    rejection_reason: str | None = Field(default=None, nullable=True)
    uploaded_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
        index=True,
    )
    reviewed_at: datetime | None = Field(default=None, nullable=True)
    reviewed_by: UUID | None = Field(default=None, nullable=True)
