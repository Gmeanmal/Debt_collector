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
