from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

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
        ...,
        description="Opaque refresh token previously issued by /auth/login or /auth/refresh",
        examples=["abc123"],
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


class ImpersonationAccess(BaseModel):
    access_token: str = Field(
        ...,
        description="Short-lived access token impersonating the target user",
        examples=["eyJ..."],
    )
    expires_in: int = Field(
        ..., description="Impersonation access token lifetime in seconds", examples=[1800]
    )
