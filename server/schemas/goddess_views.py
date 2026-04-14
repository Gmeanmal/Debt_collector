import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class WeeklyPaymentBucket(BaseModel):
    week_start: datetime.date = Field(
        ...,
        description="Monday of the ISO week (Europe/London)",
        examples=["2026-04-07"],
    )
    week_end: datetime.date = Field(
        ...,
        description="Sunday of the ISO week (Europe/London)",
        examples=["2026-04-13"],
    )
    total: Decimal = Field(
        ...,
        description="Sum of validated payments received in this week (GBP)",
        examples=["125.00"],
    )
    count: int = Field(
        ...,
        description="Number of validated payment declarations in this week",
        examples=[3],
    )


class LateSubItem(BaseModel):
    sub_id: UUID = Field(
        ...,
        description="UUID of the sub who is late",
        examples=["00000000-0000-0000-0000-000000000002"],
    )
    display_name: str | None = Field(
        default=None,
        description="Display name of the sub (first + last, or username fallback)",
        examples=["Jane Doe"],
    )
    days_late: int = Field(
        ...,
        description="Number of calendar days past the rolling tribute deadline",
        examples=[3],
    )
    overdue_amount: Decimal = Field(
        ...,
        description="Amount overdue in GBP (rolling amount_due including any late penalty)",
        examples=["55.00"],
    )
    last_payment_at: datetime.datetime | None = Field(
        default=None,
        description="UTC datetime of the most recent validated payment, or null if none",
        examples=["2026-04-01T12:00:00"],
    )
