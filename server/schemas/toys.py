from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from models.toy_item import ToyCategory, ToyProposedBy


class ToyItemCreateIn(BaseModel):
    category: ToyCategory = Field(
        ...,
        description="Toy category bucket used to group the item in inventory views",
        examples=["restraint"],
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Short human-readable name for the toy item",
        examples=["Leather wrist cuffs"],
    )
    description: str | None = Field(
        default=None,
        description="Optional notes describing colour, size, safety info, or provenance",
        examples=["Black, padded, quick-release"],
    )
    photo_r2_key: str | None = Field(
        default=None,
        description="Optional R2 object key for the photo uploaded in phase B4",
        examples=["toys/goddess/abc123.jpg"],
    )


class ToyItemProposeIn(BaseModel):
    category: ToyCategory = Field(
        ...,
        description="Toy category bucket used to group the item in inventory views",
        examples=["plug"],
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Short human-readable name for the proposed toy item",
        examples=["Silicone plug size M"],
    )
    description: str | None = Field(
        default=None,
        description="Optional notes for the goddess to consider during approval",
        examples=["Body-safe silicone, 3cm base"],
    )
    photo_r2_key: str | None = Field(
        default=None,
        description="Optional R2 object key for the photo uploaded in phase B4",
        examples=["toys/sub/xyz789.jpg"],
    )


class ToyItemUpdateIn(BaseModel):
    category: ToyCategory | None = Field(
        default=None,
        description="Updated category",
        examples=["collar"],
    )
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
        description="Updated name",
        examples=["Heavy steel collar"],
    )
    description: str | None = Field(
        default=None,
        description="Updated notes (pass null to clear)",
        examples=["Engraved, posture collar"],
    )
    photo_r2_key: str | None = Field(
        default=None,
        description="Updated R2 object key for the photo (pass null to clear)",
        examples=["toys/goddess/updated.jpg"],
    )


class ToyItemOut(BaseModel):
    id: UUID = Field(..., description="Toy item UUID")
    sub_id: UUID = Field(..., description="Owning sub UUID")
    goddess_id: UUID = Field(..., description="Owning goddess UUID")
    category: ToyCategory = Field(
        ...,
        description="Toy category bucket",
        examples=["restraint"],
    )
    name: str = Field(
        ...,
        description="Toy name",
        examples=["Leather wrist cuffs"],
    )
    description: str | None = Field(
        default=None,
        description="Optional notes",
    )
    photo_r2_key: str | None = Field(
        default=None,
        description="R2 object key for the photo (nullable until B4 upload)",
    )
    proposed_by: ToyProposedBy = Field(
        ...,
        description="Who created the item",
        examples=["goddess"],
    )
    approved: bool = Field(
        ...,
        description="Whether the goddess has approved the item (true for goddess-created)",
        examples=[True],
    )
    created_at: datetime = Field(..., description="UTC datetime when the item was created")
    updated_at: datetime = Field(..., description="UTC datetime of last update")

    model_config = {"from_attributes": True}
