from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from models.profile_change_request import ProfileChangeRequestStatus
from models.user import AvatarKey


class ProfileChangeRequestIn(BaseModel):
    """Payload for a sub to submit a profile change request."""

    proposed_first_name: str | None = Field(
        default=None,
        description="Proposed new first name.",
        examples=["Alice"],
        max_length=100,
    )
    proposed_last_name: str | None = Field(
        default=None,
        description="Proposed new last name.",
        examples=["Smith"],
        max_length=100,
    )
    proposed_display_name: str | None = Field(
        default=None,
        description="Proposed display name override.",
        examples=["Lady Alice"],
        max_length=100,
    )
    proposed_notes: str | None = Field(
        default=None,
        description="Free-text notes for the goddess reviewing the request.",
        examples=["I changed my name legally."],
        max_length=500,
    )
    proposed_avatar_key: AvatarKey | None = Field(
        default=None,
        description="Proposed new avatar key.",
        examples=["pink_1"],
    )
    proposed_real_name: str | None = Field(
        default=None,
        description="Proposed new real name (goddess-only field). Requires goddess approval.",
        examples=["Jane Doe"],
        max_length=200,
    )

    model_config = {"str_strip_whitespace": True}


class ProfileChangeRequestOut(BaseModel):
    """Read representation of a profile change request."""

    id: UUID = Field(
        ...,
        description="Request UUID.",
        examples=["00000000-0000-0000-0000-000000000001"],
    )
    sub_id: UUID = Field(
        ...,
        description="Sub who submitted the request.",
        examples=["00000000-0000-0000-0000-000000000002"],
    )
    requested_at: datetime = Field(
        ...,
        description="When the request was submitted (UTC).",
        examples=["2026-04-15T09:00:00"],
    )
    status: ProfileChangeRequestStatus = Field(
        ...,
        description="Current lifecycle status.",
        examples=["pending"],
    )
    proposed_first_name: str | None = Field(
        default=None, description="Proposed first name.", examples=["Alice"]
    )
    proposed_last_name: str | None = Field(
        default=None, description="Proposed last name.", examples=["Smith"]
    )
    proposed_display_name: str | None = Field(
        default=None, description="Proposed display name.", examples=["Lady Alice"]
    )
    proposed_notes: str | None = Field(
        default=None, description="Sub notes for the goddess.", examples=[None]
    )
    proposed_avatar_key: AvatarKey | None = Field(
        default=None, description="Proposed avatar key.", examples=["pink_2"]
    )
    proposed_real_name: str | None = Field(
        default=None, description="Proposed real name change.", examples=["Jane Doe"]
    )
    fee_amount: Decimal | None = Field(
        default=None, description="Fee imposed by goddess (GBP).", examples=[None]
    )
    fee_payment_id: UUID | None = Field(
        default=None,
        description="Payment declaration linked to the fee.",
        examples=[None],
    )
    resolved_at: datetime | None = Field(
        default=None, description="When the request was resolved (UTC).", examples=[None]
    )
    resolution_note: str | None = Field(
        default=None, description="Goddess resolution note.", examples=[None]
    )

    model_config = {"from_attributes": True}


class GoddessSetFeeIn(BaseModel):
    """Payload for a goddess to impose a fee on a change request."""

    fee_amount: Decimal = Field(
        ...,
        description="Fee amount in GBP (NUMERIC 12,2).",
        examples=["5.00"],
        gt=0,
    )


class GoddessRejectIn(BaseModel):
    """Payload for a goddess to reject a change request."""

    note: str | None = Field(
        default=None,
        description="Optional rejection reason shown to the sub.",
        examples=["Not approved at this time."],
        max_length=500,
    )


class GoddessEditSubProfileIn(BaseModel):
    """Payload for a goddess to directly edit a sub's profile fields."""

    first_name: str | None = Field(
        default=None, description="New first name.", examples=["Alice"], max_length=100
    )
    last_name: str | None = Field(
        default=None, description="New last name.", examples=["Smith"], max_length=100
    )
    avatar_key: AvatarKey | None = Field(
        default=None, description="New avatar key.", examples=["dark_1"]
    )

    model_config = {"str_strip_whitespace": True}


class PaymentHandleIn(BaseModel):
    """Payload for a sub to set their payment handle."""

    payment_handle: str | None = Field(
        default=None,
        description="Payment handle (max 64 chars). Pass null to clear.",
        examples=["alicesub"],
        max_length=64,
    )

    model_config = {"str_strip_whitespace": True}


class PaymentHandleOut(BaseModel):
    """Response after updating payment handle."""

    payment_handle: str | None = Field(
        default=None,
        description="The stored payment handle.",
        examples=["alicesub"],
    )
