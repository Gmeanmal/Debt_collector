from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from models.sub_photo import SubPhotoStatus


class SubPhotoOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Unique identifier for the uploaded photo.",
        examples=["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
    )
    status: SubPhotoStatus = Field(
        ...,
        description="Review status: pending → approved | rejected.",
        examples=["pending"],
    )
    uploaded_at: datetime = Field(
        ...,
        description="UTC timestamp when the photo was uploaded.",
        examples=["2026-04-16T22:00:00"],
    )
    presigned_get_url: str = Field(
        ...,
        description=(
            "Presigned GET URL valid for 10 minutes. "
            "Use this to display the photo immediately after upload."
        ),
        examples=["https://minio.example.com/sub-photos/abc/def/img.jpg?X-Amz-Signature=…"],
    )

    model_config = {"from_attributes": True}


class SubPhotoQueueOut(BaseModel):
    """One entry in the goddess review queue."""

    id: UUID = Field(
        ...,
        description="Unique identifier for the photo.",
        examples=["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
    )
    sub_id: UUID = Field(
        ...,
        description="UUID of the sub who uploaded this photo.",
        examples=["00000000-0000-0000-0000-000000000002"],
    )
    sub_username: str = Field(
        ...,
        description="Username of the sub who uploaded this photo.",
        examples=["kitten99"],
    )
    sub_display_name: str | None = Field(
        default=None,
        description="Human-readable display name (first + last) for the sub, or null if unset.",
        examples=["Jane Doe"],
    )
    uploaded_at: datetime = Field(
        ...,
        description="UTC timestamp when the photo was uploaded.",
        examples=["2026-04-16T22:00:00"],
    )
    mime_type: str = Field(
        ...,
        description="MIME type of the uploaded file.",
        examples=["image/jpeg"],
    )
    byte_size: int = Field(
        ...,
        description="Size of the stored (EXIF-stripped) file in bytes.",
        examples=[204800],
    )
    presigned_get_url: str = Field(
        ...,
        description="Presigned GET URL valid for 10 minutes.",
        examples=["https://minio.example.com/sub-photos/abc/def/img.jpg?X-Amz-Signature=…"],
    )

    model_config = {"from_attributes": True}


class SubPhotoReviewOut(BaseModel):
    """Result of a goddess approve or reject action."""

    id: UUID = Field(
        ...,
        description="Unique identifier for the photo.",
        examples=["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
    )
    status: SubPhotoStatus = Field(
        ...,
        description="Updated review status.",
        examples=["approved"],
    )
    reviewed_at: datetime | None = Field(
        default=None,
        description="UTC timestamp when the review action was applied.",
        examples=["2026-04-16T22:05:00"],
    )
    rejection_reason: str | None = Field(
        default=None,
        description="Rejection reason; populated only when status is rejected.",
        examples=["Does not meet quality standards."],
    )

    model_config = {"from_attributes": True}


class SubPhotoRejectIn(BaseModel):
    """Request body for the goddess reject endpoint."""

    reason: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Reason for rejecting the photo. Shown to the sub.",
        examples=["Image is blurry and does not meet the required quality."],
    )
