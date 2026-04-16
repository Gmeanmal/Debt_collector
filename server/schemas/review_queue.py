import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


class ReviewItemKind(StrEnum):
    ritual_occurrence = "ritual_occurrence"
    task = "task"


class ReviewQueueItemOut(BaseModel):
    kind: ReviewItemKind = Field(
        ...,
        description="Whether the item is a ritual occurrence or a task",
        examples=["ritual_occurrence"],
    )
    id: UUID = Field(..., description="Occurrence or task UUID")
    sub_id: UUID = Field(..., description="Sub's user UUID")
    sub_username: str = Field(..., description="Sub's username", examples=["little_rose"])
    sub_display_name: str | None = Field(default=None, description="Sub's display name")
    title: str = Field(
        ..., description="Ritual title or task title", examples=["Morning devotion photo"]
    )
    submitted_at: datetime.datetime = Field(
        ..., description="UTC timestamp when the sub submitted the item"
    )
    evidence_r2_key: str | None = Field(default=None, description="R2 key for uploaded evidence")
    evidence_presigned_url: str | None = Field(
        default=None, description="Presigned GET URL for evidence (10-min TTL)"
    )
    note: str | None = Field(default=None, description="Sub's note accompanying the submission")
    points_on_complete: int = Field(
        ..., description="Points credited on approval", examples=[2]
    )

    model_config = {"from_attributes": True}


class BulkItemRef(BaseModel):
    kind: ReviewItemKind = Field(
        ...,
        description="Whether the item is a ritual occurrence or a task",
        examples=["task"],
    )
    id: UUID = Field(..., description="Occurrence or task UUID")


class BulkAction(StrEnum):
    approve = "approve"
    reject = "reject"


class BulkActionIn(BaseModel):
    action: BulkAction = Field(
        ...,
        description="Whether to approve or reject the selected items",
        examples=["approve"],
    )
    items: list[BulkItemRef] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of items to act on",
    )
    reason: str | None = Field(
        default=None,
        min_length=1,
        max_length=500,
        description="Rejection reason — required when action=reject",
        examples=["Evidence not acceptable"],
    )


class BulkItemResult(BaseModel):
    kind: ReviewItemKind = Field(..., description="Item kind")
    id: UUID = Field(..., description="Item UUID")


class BulkItemFailure(BaseModel):
    kind: ReviewItemKind = Field(..., description="Item kind")
    id: UUID = Field(..., description="Item UUID")
    error: str = Field(..., description="Short error description", examples=["not found"])


class BulkActionOut(BaseModel):
    succeeded: list[BulkItemResult] = Field(
        ..., description="Items that were successfully acted on"
    )
    failed: list[BulkItemFailure] = Field(
        ..., description="Items that could not be acted on, with reasons"
    )
