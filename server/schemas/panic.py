from datetime import datetime

from pydantic import BaseModel, Field


class PanicOut(BaseModel):
    paused_rituals: int = Field(
        ...,
        description="Number of rituals that were paused by this call.",
        examples=[3],
    )
    released: bool = Field(
        ...,
        description=(
            "True if ownership_status was transitioned to `released`. "
            "False if it was already `released` (no-op) or the sub has no goddess."
        ),
        examples=[True],
    )
    ts: datetime = Field(
        ...,
        description="UTC timestamp at which the panic was processed.",
        examples=["2026-04-16T12:00:00"],
    )
    cancelled_tasks: int = Field(
        ...,
        description="Number of open + submitted tasks cancelled by this call.",
        examples=[2],
    )
