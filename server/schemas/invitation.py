from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class InvitationStatus(StrEnum):
    active = "active"
    pending_entry_tribute_paid = "pending_entry_tribute_paid"
    consumed = "consumed"
    expired = "expired"


class InvitationCreate(BaseModel):
    entry_tribute_amount: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Entry tribute amount in GBP that the sub must declare on signup",
        examples=["50.00"],
    )
    note: str | None = Field(
        default=None,
        description="Optional private note visible to the sub on the invitation landing page",
        examples=["Welcome, slave."],
    )
    expires_in_days: int = Field(
        default=7,
        ge=1,
        le=30,
        description="How many days from now until the invitation link expires",
        examples=[7],
    )


class InvitationOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Invitation UUID",
        examples=["00000000-0000-0000-0000-000000000001"],
    )
    token: str = Field(
        ...,
        description="URL-safe token embedded in the invite link",
        examples=["abc123xyz"],
    )
    url: str = Field(
        ...,
        description="Full invite URL to share with the sub",
        examples=["http://localhost:4010/invite/abc123xyz"],
    )
    entry_tribute_amount: Decimal = Field(
        ..., description="Entry tribute amount in GBP", examples=["50.00"]
    )
    note: str | None = Field(default=None, description="Optional note", examples=["Welcome."])
    expires_at: datetime = Field(..., description="UTC expiry datetime of the invitation")
    used_at: datetime | None = Field(
        default=None, description="UTC datetime when the invitation was consumed"
    )
    created_at: datetime = Field(..., description="UTC datetime when the invitation was created")
    status: InvitationStatus = Field(
        ...,
        description=(
            "Derived status: 'active' (unused, not expired), 'expired' (unused, past expiry), "
            "'pending_entry_tribute_paid' (used but sub has not yet paid entry tribute), "
            "'consumed' (used and sub is active)"
        ),
        examples=["active"],
    )

    model_config = {"from_attributes": True}


class InvitationResendRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="Recipient email address to send the invitation to",
        examples=["slave@example.com"],
    )


class InvitationPreviewOut(BaseModel):
    subject: str = Field(
        ...,
        description="Email subject line",
        examples=["You have been invited"],
    )
    html: str = Field(
        ...,
        description="Rendered HTML body of the invitation email",
        examples=["<html>...</html>"],
    )


class PublicInvitationOut(BaseModel):
    token: str = Field(..., description="Invitation token", examples=["abc123xyz"])
    goddess_display_name: str = Field(
        ...,
        description="Display name of the Goddess who created the invitation",
        examples=["Goddess Mean Mal"],
    )
    note: str | None = Field(
        default=None,
        description="Optional note from the Goddess",
        examples=["Welcome."],
    )
    entry_tribute_amount: Decimal = Field(
        ..., description="Amount the sub must tribute on signup (GBP)", examples=["50.00"]
    )
    expires_at: datetime = Field(..., description="UTC expiry datetime of the invitation")


class SignupRequest(BaseModel):
    email: str = Field(
        ...,
        description="Sub's email address",
        examples=["slave@example.com"],
    )
    password: str = Field(
        ...,
        min_length=8,
        description="Sub's password (min 8 characters)",
        examples=["s3cr3tP@ss"],
    )
    username: str = Field(
        ...,
        min_length=2,
        description="Unique username for the sub",
        examples=["slave42"],
    )
    first_name: str | None = Field(default=None, description="Sub's first name", examples=["John"])
    last_name: str | None = Field(default=None, description="Sub's last name", examples=["Doe"])
    gender: str | None = Field(
        default=None,
        description="Gender identity (free-text, max 64 chars)",
        examples=["non-binary"],
        max_length=64,
    )
    pronouns: str | None = Field(
        default=None,
        description="Preferred pronouns (free-text, max 64 chars)",
        examples=["they/them"],
        max_length=64,
    )
    location: str | None = Field(
        default=None,
        description="City or 'City, Country' (max 120 chars)",
        examples=["London, UK"],
        max_length=120,
    )
    timezone: str = Field(
        ...,
        description="IANA timezone string, auto-detected by the client",
        examples=["Europe/London"],
        max_length=64,
    )
    date_of_birth: date = Field(
        ...,
        description="Date of birth (YYYY-MM-DD). Sub must be at least 18 years old.",
        examples=["1990-01-15"],
    )
    real_name: str | None = Field(
        default=None,
        description="Real name (goddess-only field, max 200 chars). Set once at signup.",
        examples=["John Doe"],
        max_length=200,
    )

    @field_validator("date_of_birth")
    @classmethod
    def validate_age(cls, v: date) -> date:
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 18:
            raise ValueError("must be at least 18 years old")
        return v
