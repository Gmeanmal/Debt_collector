import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from models.rolling import DeadlineDay


class RollingTributeIn(BaseModel):
    amount: Decimal = Field(
        ...,
        ge=Decimal("0"),
        le=Decimal("9999999999.99"),
        description="Weekly tribute amount in GBP",
        examples=[Decimal("50.00")],
    )
    deadline_day: DeadlineDay = Field(
        ...,
        description="Day of the week the tribute is due",
        examples=["fri"],
    )
    deadline_time: datetime.time = Field(
        ...,
        description="Time of day the tribute is due (London local time, HH:MM)",
        examples=[datetime.time(18, 0)],
    )
    late_multiplier_per_day: int = Field(
        default=1,
        ge=0,
        le=30,
        description="Amount multiplier added per day late (0 = no late penalty)",
        examples=[1],
    )
    paused: bool = Field(
        default=False,
        description="When true the tribute cycle is suspended",
        examples=[False],
    )
    notes: str | None = Field(
        default=None,
        max_length=500,
        description="Optional private notes visible to the Goddess only",
        examples=["Paused for holiday week"],
    )


class RollingTributeOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Rolling tribute record UUID",
        examples=["00000000-0000-0000-0000-000000000001"],
    )
    sub_id: UUID = Field(
        ...,
        description="UUID of the sub this tribute belongs to",
        examples=["00000000-0000-0000-0000-000000000002"],
    )
    amount: Decimal = Field(
        ...,
        description="Configured weekly tribute amount in GBP",
        examples=[Decimal("50.00")],
    )
    deadline_day: DeadlineDay = Field(
        ...,
        description="Day of the week the tribute is due",
        examples=["fri"],
    )
    deadline_time: datetime.time = Field(
        ...,
        description="Time of day the tribute is due (London local time)",
        examples=[datetime.time(18, 0)],
    )
    late_multiplier_per_day: int = Field(
        ...,
        description="Amount multiplier added per day late",
        examples=[1],
    )
    paused: bool = Field(
        ...,
        description="Whether the tribute cycle is currently paused",
        examples=[False],
    )
    notes: str | None = Field(
        default=None,
        description="Optional private notes",
        examples=["Paused for holiday week"],
    )
    last_paid_at: datetime.datetime | None = Field(
        default=None,
        description="UTC datetime of the most recent validated rolling payment",
        examples=[None],
    )
    current_cycle_deadline: datetime.datetime = Field(
        ...,
        description="UTC datetime of the next (or current) cycle deadline",
        examples=["2026-04-18T18:00:00"],
    )
    amount_due: Decimal = Field(
        ...,
        description="Amount currently owed including any late penalty (GBP)",
        examples=[Decimal("50.00")],
    )
    days_late: int = Field(
        ...,
        description="Number of calendar days past the last deadline (0 if on time or paused)",
        examples=[0],
    )
    created_at: datetime.datetime = Field(
        ...,
        description="UTC datetime when this record was created",
    )
    updated_at: datetime.datetime = Field(
        ...,
        description="UTC datetime when this record was last updated",
    )

    model_config = {"from_attributes": True}
