from datetime import datetime

from pydantic import BaseModel, Field


class ThroneConnectionIn(BaseModel):
    account_id: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="The Throne account identifier (visible on the Throne dashboard)",
        examples=["throne_12345"],
    )
    access_token: str = Field(
        ...,
        min_length=8,
        description=(
            "The Throne API access token. "
            "Stored encrypted via the per-goddess envelope; never echoed back."
        ),
        examples=["tk_live_abcdefghijklmnop"],
    )


class ThroneConnectionOut(BaseModel):
    is_configured: bool = Field(
        ...,
        description="True when a Throne connection exists for the authenticated goddess",
        examples=[True],
    )
    account_id: str | None = Field(
        default=None,
        description="The Throne account identifier, or null when not configured",
        examples=["throne_12345"],
    )
    token_last4: str | None = Field(
        default=None,
        description=(
            "Last 4 characters of the stored access token, "
            "or null when not configured. Never the full token."
        ),
        examples=["mnop"],
    )
    created_at: datetime | None = Field(
        default=None,
        description="UTC datetime when the connection was first created",
    )
    updated_at: datetime | None = Field(
        default=None,
        description="UTC datetime of the last update to the connection",
    )
