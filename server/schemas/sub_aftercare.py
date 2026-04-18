from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SubAftercareOut(BaseModel):
    """Read representation of a sub's aftercare profile."""

    sub_id: UUID = Field(
        ...,
        description="UUID of the sub who owns this aftercare record.",
        examples=["00000000-0000-0000-0000-000000000001"],
    )
    needs: str | None = Field(
        default=None,
        description="What the sub needs after an intense scene (free text).",
        examples=["Quiet time, a warm blanket, and soft music."],
    )
    comfort_items: str | None = Field(
        default=None,
        description="Physical or emotional comfort items that help the sub.",
        examples=["Stuffed animal, warm tea, weighted blanket."],
    )
    contact_phrase: str | None = Field(
        default=None,
        description="A phrase or signal that means the sub is ready to re-engage.",
        examples=["I'm grounded."],
    )
    notes: str | None = Field(
        default=None,
        description="Any additional aftercare notes for the goddess.",
        examples=["Please check in after 30 minutes."],
    )
    intensity: int = Field(
        default=3,
        description="Aftercare intensity on a scale of 1 (gentle) to 5 (intense).",
        examples=[3],
    )
    read_by_goddess_at: datetime | None = Field(
        default=None,
        description="When the goddess last read this aftercare profile (UTC). Null if never read.",
        examples=["2026-04-18T12:00:00"],
    )
    updated_at: datetime = Field(
        ...,
        description="When this record was last modified (UTC).",
        examples=["2026-04-16T12:00:00"],
    )

    model_config = {"from_attributes": True}


class SubAftercareUpdate(BaseModel):
    """Payload for a sub to update her own aftercare profile. All fields optional."""

    needs: str | None = Field(
        default=None,
        description="What the sub needs after an intense scene (free text).",
        examples=["Quiet time and a warm blanket."],
    )
    comfort_items: str | None = Field(
        default=None,
        description="Physical or emotional comfort items.",
        examples=["Stuffed animal, warm tea."],
    )
    contact_phrase: str | None = Field(
        default=None,
        description="Phrase the sub uses to signal readiness to re-engage.",
        examples=["I'm grounded."],
    )
    notes: str | None = Field(
        default=None,
        description="Additional aftercare notes for the goddess.",
        examples=["Check in after 30 minutes."],
    )
    intensity: int | None = Field(
        default=None,
        ge=1,
        le=5,
        description="Aftercare intensity from 1 (gentle) to 5 (intense).",
        examples=[3],
    )

    model_config = {"str_strip_whitespace": True}
