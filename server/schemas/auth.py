from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from models.user import UserRole, UserStatus


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
    avatar_url: str | None = Field(None, description="Avatar URL", examples=[None])
    theme_preference: str = Field(..., description="UI theme preference", examples=["system"])
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
    avatar_url: str | None = Field(
        None, description="Avatar image URL", examples=["https://example.com/avatar.png"]
    )

    model_config = {"str_strip_whitespace": True}

    @field_validator("avatar_url")
    @classmethod
    def avatar_url_must_be_http(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("avatar_url must be a valid HTTP/HTTPS URL")
        return v


class ImpersonationAccess(BaseModel):
    access_token: str = Field(
        ...,
        description="Short-lived access token impersonating the target user",
        examples=["eyJ..."],
    )
    expires_in: int = Field(
        ..., description="Impersonation access token lifetime in seconds", examples=[1800]
    )
