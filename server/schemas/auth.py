from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from models.user import AvatarKey, UserRole, UserStatus


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address", examples=["sub@example.com"])
    password: str = Field(..., description="User password", examples=["s3cr3t!"])


class TokenPair(BaseModel):
    access_token: str = Field(..., description="Short-lived JWT access token", examples=["eyJ..."])
    refresh_token: str = Field(
        ..., description="Opaque refresh token (rotate on each use)", examples=["abc123"]
    )
    token_type: Literal["bearer"] = Field(default="bearer", description="OAuth2 token type")
    expires_in: int = Field(..., description="Access token lifetime in seconds", examples=[900])


class RefreshRequest(BaseModel):
    refresh_token: str = Field(
        default="",
        description=(
            "Opaque refresh token previously issued by /auth/login or /auth/refresh. "
            "Deprecated: the server now reads the refresh token from the HttpOnly cookie "
            "`debt_refresh`. Supply this field only for legacy clients that cannot use cookies."
        ),
        examples=[""],
    )


class PasswordResetRequest(BaseModel):
    email: str = Field(
        ..., description="Email address of the account to reset", examples=["sub@example.com"]
    )


class PasswordResetConfirm(BaseModel):
    token: str = Field(..., description="Reset token from the email link", examples=["abc123"])
    new_password: str = Field(
        ...,
        min_length=8,
        description="New password to set (min 8 chars)",
        examples=["n3wP@ssw0rd"],
    )


class UserOut(BaseModel):
    id: UUID = Field(
        ..., description="User UUID", examples=["00000000-0000-0000-0000-000000000001"]
    )
    email: str = Field(..., description="User email", examples=["sub@example.com"])
    role: UserRole = Field(..., description="User role", examples=["sub"])
    status: UserStatus = Field(..., description="Account status", examples=["active"])
    display_name: str = Field(..., description="User display name", examples=["Jane"])
    first_name: str | None = Field(None, description="First name", examples=["Jane"])
    last_name: str | None = Field(None, description="Last name", examples=["Doe"])
    bio: str | None = Field(
        None,
        description="Free-text bio (max 500 chars)",
        examples=["A sub living in London."],
    )
    avatar_key: AvatarKey = Field(
        default=AvatarKey.default, description="Avatar key", examples=["default"]
    )
    payment_handle: str | None = Field(
        None,
        description=(
            "Sub's payment handle (Throne / PayPal username) used to match incoming payments."
        ),
        examples=["demosub3"],
    )
    theme_preference: str = Field(..., description="UI theme preference", examples=["system"])
    gender: str | None = Field(
        None, description="Gender identity (free-text)", examples=["non-binary"]
    )
    pronouns: str | None = Field(None, description="Preferred pronouns", examples=["they/them"])
    location: str | None = Field(
        None, description="City or 'City, Country'", examples=["London, UK"]
    )
    timezone: str | None = Field(
        None, description="IANA timezone string", examples=["Europe/London"]
    )
    date_of_birth: date | None = Field(
        None, description="Date of birth (YYYY-MM-DD)", examples=["1990-01-15"]
    )
    real_name: str | None = Field(
        None,
        description=(
            "Real name. Included only for the caller viewing their own profile, "
            "or a goddess viewing her own sub, or an admin. Never exposed to other users."
        ),
        examples=["John Doe"],
    )
    created_at: datetime = Field(..., description="Account creation timestamp (UTC)")
    impersonator_id: UUID | None = Field(
        None,
        description="Set when this session is an admin impersonation. UUID of the admin.",
        examples=[None],
    )
    impersonator_display_name: str | None = Field(
        None,
        description="Display name of the impersonating admin, when applicable.",
        examples=[None],
    )
    entry_tribute_amount: Decimal | None = Field(
        None,
        description=(
            "Amount of the entry tribute owed, in GBP. "
            "Populated from the sub's invitation row only when `status == pending_entry_tribute`. "
            "Null for all other statuses or non-sub accounts."
        ),
        examples=["30.00", None],
    )


class ProfileUpdate(BaseModel):
    first_name: str | None = Field(
        None, description="First name", examples=["Jane"], max_length=100
    )
    last_name: str | None = Field(None, description="Last name", examples=["Doe"], max_length=100)
    bio: str | None = Field(
        None,
        description="Free-text bio (max 500 chars)",
        examples=["A sub living in London."],
        max_length=500,
    )
    avatar_key: AvatarKey = Field(
        default=AvatarKey.default,
        description="Avatar key selecting the pre-defined avatar image.",
        examples=["pink_1"],
    )
    gender: str | None = Field(
        None,
        description="Gender identity (free-text, max 64 chars)",
        examples=["non-binary"],
        max_length=64,
    )
    pronouns: str | None = Field(
        None,
        description="Preferred pronouns (free-text, max 64 chars)",
        examples=["they/them"],
        max_length=64,
    )
    location: str | None = Field(
        None,
        description="City or 'City, Country' (max 120 chars)",
        examples=["London, UK"],
        max_length=120,
    )
    timezone: str | None = Field(
        None,
        description="IANA timezone string (max 64 chars)",
        examples=["Europe/London"],
        max_length=64,
    )
    date_of_birth: date | None = Field(
        None, description="Date of birth (YYYY-MM-DD)", examples=["1990-01-15"]
    )
    real_name: str | None = Field(
        None,
        description=(
            "Real name (max 200 chars). "
            "If already set, changes are routed through ProfileChangeRequest."
        ),
        examples=["John Doe"],
        max_length=200,
    )

    model_config = {"str_strip_whitespace": True}


class ImpersonationAccess(BaseModel):
    access_token: str = Field(
        ...,
        description="Short-lived access token impersonating the target user",
        examples=["eyJ..."],
    )
    expires_in: int = Field(
        ..., description="Impersonation access token lifetime in seconds", examples=[1800]
    )
