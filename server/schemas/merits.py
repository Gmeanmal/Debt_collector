import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PointsBalanceOut(BaseModel):
    balance: int = Field(
        ...,
        description="Net points balance: SUM(delta) for all merit events scoped to this goddess",
        examples=[42],
    )
    last_event_at: datetime.datetime | None = Field(
        default=None,
        description="UTC timestamp of the most recent merit event, or null if none exists",
        examples=["2026-04-16T20:00:00"],
    )
    event_count: int = Field(
        ...,
        description="Total number of merit events recorded for this sub under this goddess",
        examples=[17],
    )


class RewardTierIn(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Short human-readable name for the reward tier",
        examples=["Ten minutes of praise"],
    )
    description: str | None = Field(
        default=None,
        description="Optional long-form description explaining what the sub receives",
        examples=["A voice note from Goddess thanking the sub by name"],
    )
    cost: int = Field(
        ...,
        gt=0,
        description="Merit points the sub must spend to redeem this reward",
        examples=[25],
    )
    active: bool = Field(
        default=True,
        description="Whether this tier is currently redeemable by subs",
        examples=[True],
    )


class RewardTierPatchIn(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
        description="Updated name",
        examples=["Fifteen minutes of praise"],
    )
    description: str | None = Field(
        default=None,
        description="Updated description (pass null to clear)",
        examples=["Upgraded description"],
    )
    cost: int | None = Field(
        default=None,
        gt=0,
        description="Updated cost in merit points",
        examples=[50],
    )
    active: bool | None = Field(
        default=None,
        description="Updated active flag",
        examples=[False],
    )


class RewardTierOut(BaseModel):
    id: UUID = Field(..., description="Reward tier UUID")
    goddess_id: UUID = Field(..., description="Owning goddess UUID")
    name: str = Field(..., description="Tier name", examples=["Ten minutes of praise"])
    description: str | None = Field(default=None, description="Optional description")
    cost: int = Field(..., description="Redemption cost in merit points", examples=[25])
    active: bool = Field(..., description="Whether the tier is active", examples=[True])
    created_at: datetime.datetime = Field(..., description="UTC creation timestamp")
    updated_at: datetime.datetime = Field(..., description="UTC last-updated timestamp")

    model_config = {"from_attributes": True}


class PunishmentTierIn(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Short human-readable name for the punishment tier",
        examples=["Missed check-in penalty"],
    )
    description: str | None = Field(
        default=None,
        description="Optional long-form description explaining the punishment",
        examples=["Sub must write a 200-word apology within 24h"],
    )
    default_points_penalty: int = Field(
        default=0,
        le=0,
        description="Non-positive merit points deducted when this punishment is invoked",
        examples=[-10],
    )
    active: bool = Field(
        default=True,
        description="Whether this tier can currently be invoked",
        examples=[True],
    )


class PunishmentTierPatchIn(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
        description="Updated name",
        examples=["Updated punishment name"],
    )
    description: str | None = Field(
        default=None,
        description="Updated description",
        examples=["Updated description"],
    )
    default_points_penalty: int | None = Field(
        default=None,
        le=0,
        description="Updated non-positive penalty",
        examples=[-20],
    )
    active: bool | None = Field(
        default=None,
        description="Updated active flag",
        examples=[False],
    )


class PunishmentTierOut(BaseModel):
    id: UUID = Field(..., description="Punishment tier UUID")
    goddess_id: UUID = Field(..., description="Owning goddess UUID")
    name: str = Field(..., description="Tier name", examples=["Missed check-in penalty"])
    description: str | None = Field(default=None, description="Optional description")
    default_points_penalty: int = Field(
        ...,
        description="Non-positive merit points deducted on invocation",
        examples=[-10],
    )
    active: bool = Field(..., description="Whether the tier is active", examples=[True])
    created_at: datetime.datetime = Field(..., description="UTC creation timestamp")
    updated_at: datetime.datetime = Field(..., description="UTC last-updated timestamp")

    model_config = {"from_attributes": True}


class RedeemOut(BaseModel):
    redemption_id: UUID = Field(
        ...,
        description="UUID of the created reward_redemption row",
        examples=["9f1e1a6c-4c58-4a57-8e44-0e9f0b4b5a10"],
    )
    new_balance: int = Field(
        ...,
        description="Sub's merit points balance after the debit was applied",
        examples=[17],
    )


class MeritEventOut(BaseModel):
    id: UUID = Field(..., description="Merit event UUID")
    source_kind: str = Field(
        ...,
        description="Origin of this event (ritual_complete, task_miss, manual, etc.)",
        examples=["ritual_complete"],
    )
    delta: int = Field(
        ...,
        description="Points change: positive for credit, negative for debit",
        examples=[2],
    )
    note: str | None = Field(default=None, description="Optional descriptive note")
    created_at: datetime.datetime = Field(..., description="UTC timestamp of the event")

    model_config = {"from_attributes": True}


class InvokeIn(BaseModel):
    sub_id: UUID = Field(
        ...,
        description="UUID of the sub to invoke the punishment against",
        examples=["c3a1c9dd-5d2f-4d1e-8c39-7f54b6e1d0ab"],
    )
