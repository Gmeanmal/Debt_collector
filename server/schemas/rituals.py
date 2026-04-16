import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from models.ritual import RitualFrequency
from models.ritual_occurrence import OccurrenceStatus


class RitualCreateIn(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Short name for the ritual",
        examples=["Morning devotion photo"],
    )
    description: str | None = Field(
        default=None,
        description="Optional longer description visible to the sub",
        examples=["Take a photo each morning before 09:00"],
    )
    frequency: RitualFrequency = Field(
        ...,
        description="How often the ritual recurs: daily, weekly, or custom days",
        examples=["daily"],
    )
    custom_days_bitmask: int | None = Field(
        default=None,
        ge=1,
        le=127,
        description=(
            "Required when frequency=custom. Bitmask: Mon=1, Tue=2, Wed=4, Thu=8, "
            "Fri=16, Sat=32, Sun=64. Combine with bitwise OR."
        ),
        examples=[65],
    )
    deadline_time: datetime.time | None = Field(
        default=datetime.time(23, 59),
        description="Wall-clock deadline in Europe/London; defaults to 23:59",
        examples=["09:00:00"],
    )
    points_on_complete: int = Field(
        default=1,
        description="Points credited to the sub when the occurrence is completed",
        examples=[2],
    )
    points_on_miss: int = Field(
        default=-1,
        description=(
            "Points debited from the sub when the occurrence is missed (should be negative or zero)"
        ),
        examples=[-2],
    )
    paused: bool = Field(
        default=False,
        description="When true the ritual is inactive and no new occurrences are generated",
        examples=[False],
    )


class RitualUpdateIn(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
        description="Updated title",
        examples=["Evening check-in"],
    )
    description: str | None = Field(
        default=None,
        description="Updated description (pass null to clear)",
        examples=["Send a goodnight message before midnight"],
    )
    frequency: RitualFrequency | None = Field(
        default=None,
        description="Updated frequency",
        examples=["weekly"],
    )
    custom_days_bitmask: int | None = Field(
        default=None,
        ge=1,
        le=127,
        description="Updated bitmask; required when frequency=custom",
        examples=[18],
    )
    deadline_time: datetime.time | None = Field(
        default=None,
        description="Updated deadline time in Europe/London",
        examples=["22:00:00"],
    )
    points_on_complete: int | None = Field(
        default=None,
        description="Updated completion points",
        examples=[3],
    )
    points_on_miss: int | None = Field(
        default=None,
        description="Updated miss points",
        examples=[-3],
    )
    paused: bool | None = Field(
        default=None,
        description="Set true to pause, false to resume",
        examples=[True],
    )


class RitualOut(BaseModel):
    id: UUID = Field(..., description="Ritual UUID")
    sub_id: UUID = Field(..., description="Owning sub UUID")
    goddess_id: UUID = Field(..., description="Owning goddess UUID")
    title: str = Field(..., description="Ritual title", examples=["Morning devotion photo"])
    description: str | None = Field(default=None, description="Optional description")
    frequency: RitualFrequency = Field(..., description="Recurrence frequency", examples=["daily"])
    custom_days_bitmask: int | None = Field(
        default=None,
        description="Custom-days bitmask when frequency=custom",
        examples=[65],
    )
    deadline_time: datetime.time | None = Field(
        default=None,
        description="Deadline wall-clock time in Europe/London",
        examples=["09:00:00"],
    )
    points_on_complete: int = Field(..., description="Points on completion", examples=[2])
    points_on_miss: int = Field(..., description="Points on miss", examples=[-2])
    paused: bool = Field(
        ..., description="Whether the ritual is currently paused", examples=[False]
    )
    created_at: datetime.datetime = Field(..., description="UTC creation timestamp")
    updated_at: datetime.datetime = Field(..., description="UTC last-updated timestamp")

    model_config = {"from_attributes": True}


class OccurrenceCompleteIn(BaseModel):
    note: str | None = Field(
        default=None,
        description="Optional note from the sub explaining completion",
        examples=["Photo sent to goddess"],
    )
    evidence_r2_key: str | None = Field(
        default=None,
        description="Optional R2 object key for evidence (B4 wires actual upload)",
        examples=["occurrences/abc123/evidence.jpg"],
    )


class OccurrenceSubmitIn(BaseModel):
    note: str | None = Field(
        default=None,
        description="Optional note from the sub accompanying the submission",
        examples=["Ready for goddess review"],
    )
    evidence_r2_key: str | None = Field(
        default=None,
        description="Optional R2 object key for evidence",
        examples=["occurrences/abc123/evidence.jpg"],
    )


class OccurrenceRejectIn(BaseModel):
    reason: str | None = Field(
        default=None,
        description="Optional reason for rejection visible to the sub",
        examples=["Evidence not acceptable — retake required"],
    )


class OccurrenceOut(BaseModel):
    id: UUID = Field(..., description="Occurrence UUID")
    ritual_id: UUID = Field(..., description="Parent ritual UUID")
    sub_id: UUID = Field(..., description="Sub UUID")
    goddess_id: UUID = Field(..., description="Goddess UUID")
    date: datetime.date = Field(
        ...,
        description="Calendar date of the occurrence in Europe/London",
        examples=["2026-04-16"],
    )
    status: OccurrenceStatus = Field(..., description="Current status", examples=["pending"])
    note: str | None = Field(default=None, description="Sub's note on completion/submission")
    evidence_r2_key: str | None = Field(default=None, description="R2 key for uploaded evidence")
    completed_at: datetime.datetime | None = Field(
        default=None, description="UTC timestamp when the occurrence was completed"
    )
    reviewed_at: datetime.datetime | None = Field(
        default=None, description="UTC timestamp when the goddess reviewed the occurrence"
    )
    reviewed_by: UUID | None = Field(
        default=None, description="UUID of the reviewing user (goddess)"
    )
    created_at: datetime.datetime = Field(..., description="UTC creation timestamp")

    model_config = {"from_attributes": True}
