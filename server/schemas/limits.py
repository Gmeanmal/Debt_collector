from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from models.sub_limit import LimitKind, LimitSeverity


class SubLimitCreate(BaseModel):
    kind: LimitKind = Field(
        ...,
        description="Whether the limit is hard (absolute, never-crossed) or soft (negotiable)",
        examples=["hard"],
    )
    severity: LimitSeverity = Field(
        ...,
        description="Severity scale the sub assigns to the limit",
        examples=["high"],
    )
    label: str = Field(
        ...,
        min_length=1,
        description="Short human-readable description of the limit (e.g. 'No breath play')",
        examples=["No breath play"],
    )
    notes: str | None = Field(
        default=None,
        description="Optional free-form extra context appended to the limit body",
        examples=["Asthma — any airway restriction is an absolute no."],
    )


class SubLimitUpdate(BaseModel):
    kind: LimitKind | None = Field(
        default=None,
        description="Replace the hard/soft classification",
        examples=["soft"],
    )
    severity: LimitSeverity | None = Field(
        default=None,
        description="Replace the severity rating",
        examples=["medium"],
    )
    label: str | None = Field(
        default=None,
        min_length=1,
        description="Replace the short label",
        examples=["No breath play"],
    )
    notes: str | None = Field(
        default=None,
        description="Replace the free-form notes (pass empty string to clear)",
        examples=["Updated context"],
    )


class SubLimitOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Primary key of the limit row",
        examples=["8f14e45f-ceea-467a-9575-2f6c2c5f0c3a"],
    )
    sub_id: UUID = Field(
        ...,
        description="Owning sub user id",
        examples=["8f14e45f-ceea-467a-9575-2f6c2c5f0c3a"],
    )
    kind: LimitKind = Field(
        ...,
        description="Hard or soft classification",
        examples=["hard"],
    )
    severity: LimitSeverity = Field(
        ...,
        description="Severity rating",
        examples=["high"],
    )
    body: str = Field(
        ...,
        description="Full limit text (label plus optional notes)",
        examples=["No breath play\n\nAsthma — any airway restriction is an absolute no."],
    )
    acknowledged_by_goddess_at: datetime | None = Field(
        default=None,
        description=(
            "UTC datetime when the goddess last acknowledged this limit; null if unacknowledged"
        ),
    )
    created_at: datetime = Field(
        ...,
        description="UTC datetime when the limit was created",
    )
    updated_at: datetime = Field(
        ...,
        description="UTC datetime when the limit was last updated",
    )

    model_config = {"from_attributes": True}


class SubTriggerCreate(BaseModel):
    severity: LimitSeverity = Field(
        ...,
        description="Severity rating the sub assigns to the trigger",
        examples=["medium"],
    )
    trigger_text: str = Field(
        ...,
        min_length=1,
        description="Short description of the trigger",
        examples=["Raised voices"],
    )
    notes: str | None = Field(
        default=None,
        description="Optional extra context",
        examples=["Especially male shouting — freeze response."],
    )


class SubTriggerUpdate(BaseModel):
    severity: LimitSeverity | None = Field(
        default=None,
        description="Replace the severity rating",
        examples=["high"],
    )
    trigger_text: str | None = Field(
        default=None,
        min_length=1,
        description="Replace the trigger description",
        examples=["Raised voices"],
    )
    notes: str | None = Field(
        default=None,
        description="Replace the notes (pass empty string to clear)",
        examples=["Updated context"],
    )


class SubTriggerOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Primary key of the trigger row",
        examples=["8f14e45f-ceea-467a-9575-2f6c2c5f0c3a"],
    )
    sub_id: UUID = Field(
        ...,
        description="Owning sub user id",
        examples=["8f14e45f-ceea-467a-9575-2f6c2c5f0c3a"],
    )
    severity: LimitSeverity = Field(
        ...,
        description="Severity rating",
        examples=["medium"],
    )
    trigger_text: str = Field(
        ...,
        description="Short description of the trigger",
        examples=["Raised voices"],
    )
    notes: str | None = Field(
        default=None,
        description="Optional extra context",
    )
    created_at: datetime = Field(
        ...,
        description="UTC datetime when the trigger was created",
    )
    updated_at: datetime = Field(
        ...,
        description="UTC datetime when the trigger was last updated",
    )

    model_config = {"from_attributes": True}
