from datetime import datetime

from pydantic import BaseModel, Field


class SubSafewordIn(BaseModel):
    word: str = Field(
        ...,
        min_length=1,
        description="The safeword itself — spoken aloud to pause or stop a scene",
        examples=["red"],
    )
    signal: str | None = Field(
        default=None,
        description="Physical safe-signal description (e.g. double-tap, dropped object)",
        examples=["double-tap on the thigh"],
    )
    emergency_contact_name: str | None = Field(
        default=None,
        description="Full name of the emergency contact",
        examples=["Jane Doe"],
    )
    emergency_contact_phone: str | None = Field(
        default=None,
        description="Phone number of the emergency contact",
        examples=["+44 7700 900000"],
    )


class SubSafewordOut(BaseModel):
    word: str = Field(
        ...,
        description="The safeword",
        examples=["red"],
    )
    signal: str | None = Field(
        default=None,
        description="Physical safe-signal description",
        examples=["double-tap on the thigh"],
    )
    emergency_contact_name: str | None = Field(
        default=None,
        description="Full name of the emergency contact",
        examples=["Jane Doe"],
    )
    emergency_contact_phone: str | None = Field(
        default=None,
        description="Phone number of the emergency contact",
        examples=["+44 7700 900000"],
    )
    updated_at: datetime = Field(
        ...,
        description="UTC datetime when this record was last updated",
    )

    model_config = {"from_attributes": True}
