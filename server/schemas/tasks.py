import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from models.task import TaskStatus


class TaskCreateIn(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Short title describing the task",
        examples=["Write a 500-word reflection on obedience"],
    )
    description: str | None = Field(
        default=None,
        description="Optional detailed instructions for the sub",
        examples=["Due before Sunday midnight. No excuses."],
    )
    due_at: datetime.datetime | None = Field(
        default=None,
        description="Optional UTC deadline; display to sub in Europe/London",
        examples=["2026-04-20T23:00:00"],
    )
    points_on_complete: int = Field(
        default=1,
        description="Points credited to the sub when the task is approved",
        examples=[5],
    )
    points_on_miss: int = Field(
        default=-1,
        description="Points debited from the sub when the task is overdue without submission",
        examples=[-5],
    )


class TaskUpdateIn(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
        description="Updated title",
        examples=["Write a 1000-word reflection"],
    )
    description: str | None = Field(
        default=None,
        description="Updated description (pass null to clear)",
        examples=["Extended deadline granted"],
    )
    due_at: datetime.datetime | None = Field(
        default=None,
        description="Updated deadline (pass null to remove)",
        examples=["2026-04-21T23:00:00"],
    )
    points_on_complete: int | None = Field(
        default=None,
        description="Updated completion points",
        examples=[10],
    )
    points_on_miss: int | None = Field(
        default=None,
        description="Updated miss points",
        examples=[-10],
    )


class TaskRejectIn(BaseModel):
    reason: str | None = Field(
        default=None,
        description="Optional reason for rejection visible to the sub",
        examples=["Submission did not meet requirements — redo this"],
    )


class TaskSubmitIn(BaseModel):
    note: str | None = Field(
        default=None,
        description="Optional note from the sub accompanying the submission",
        examples=["Completed ahead of schedule"],
    )
    evidence_r2_key: str | None = Field(
        default=None,
        description="Optional R2 object key for evidence (B4 wires actual upload)",
        examples=["tasks/abc123/evidence.jpg"],
    )


class TaskOut(BaseModel):
    id: UUID = Field(..., description="Task UUID")
    sub_id: UUID = Field(..., description="Assigned sub UUID")
    goddess_id: UUID = Field(..., description="Assigning goddess UUID")
    title: str = Field(..., description="Task title", examples=["Write a 500-word reflection"])
    description: str | None = Field(default=None, description="Optional detailed instructions")
    due_at: datetime.datetime | None = Field(default=None, description="UTC deadline for the task")
    points_on_complete: int = Field(..., description="Points on approval", examples=[5])
    points_on_miss: int = Field(..., description="Points on overdue miss", examples=[-5])
    status: TaskStatus = Field(..., description="Current task status", examples=["open"])
    evidence_r2_key: str | None = Field(default=None, description="R2 key for submitted evidence")
    note: str | None = Field(default=None, description="Sub's submission note")
    rejection_reason: str | None = Field(
        default=None, description="Goddess rejection reason if status=rejected"
    )
    submitted_at: datetime.datetime | None = Field(
        default=None, description="UTC timestamp when the sub submitted"
    )
    reviewed_at: datetime.datetime | None = Field(
        default=None, description="UTC timestamp when the goddess reviewed"
    )
    reviewed_by: UUID | None = Field(
        default=None, description="UUID of the reviewing user (goddess)"
    )
    created_at: datetime.datetime = Field(..., description="UTC creation timestamp")
    updated_at: datetime.datetime = Field(..., description="UTC last-updated timestamp")

    model_config = {"from_attributes": True}
