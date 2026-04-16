import datetime

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
