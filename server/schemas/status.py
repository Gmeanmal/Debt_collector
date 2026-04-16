from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from models.sub_profile import OwnershipStatus


class OwnershipStatusChangeIn(BaseModel):
    to_status: OwnershipStatus = Field(
        ...,
        description="Target ownership status. Must be reachable from the current status per §16.3.",
        examples=["owned"],
    )
    reason: str | None = Field(
        default=None,
        max_length=2000,
        description="Free-text reason recorded on the status_event row for audit.",
        examples=["Collaring ceremony completed."],
    )


class SubProfileStatusOut(BaseModel):
    user_id: UUID = Field(
        ...,
        description="Identifier of the sub user whose profile this row belongs to.",
        examples=["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
    )
    ownership_status: OwnershipStatus = Field(
        ...,
        description="Current ownership status after the change.",
        examples=["owned"],
    )
    updated_at: datetime | None = Field(
        default=None,
        description="UTC datetime of the last write on the sub_profile row.",
    )


class StatusEventOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Identifier of the status event.",
        examples=["f1e2d3c4-b5a6-7890-abcd-ef1234567890"],
    )
    sub_id: UUID = Field(
        ...,
        description="Identifier of the sub whose ownership status changed.",
        examples=["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
    )
    goddess_id: UUID = Field(
        ...,
        description="Identifier of the goddess that owns the sub at event time.",
        examples=["c1d2e3f4-a5b6-7890-abcd-ef1234567890"],
    )
    from_status: OwnershipStatus = Field(
        ...,
        description="Ownership status the sub held immediately before the transition.",
        examples=["free"],
    )
    to_status: OwnershipStatus = Field(
        ...,
        description="Ownership status the sub moved to.",
        examples=["owned"],
    )
    reason: str | None = Field(
        default=None,
        description="Free-text reason attached to the event, if any.",
        examples=["Collaring ceremony completed."],
    )
    created_by: UUID = Field(
        ...,
        description="User id of the goddess user that triggered the transition.",
        examples=["d1e2f3a4-b5c6-7890-abcd-ef1234567890"],
    )
    created_at: datetime = Field(
        ...,
        description="UTC datetime at which the status change was recorded.",
    )


class OwnershipStatusChangeOut(BaseModel):
    profile: SubProfileStatusOut = Field(
        ...,
        description="Updated sub_profile row reflecting the new ownership status.",
    )
    event: StatusEventOut = Field(
        ...,
        description="The status_event row that was inserted inside the same transaction.",
    )
