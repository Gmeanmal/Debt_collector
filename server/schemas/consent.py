from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ConsentTextOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Identifier of this specific consent text version",
        examples=["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
    )
    slug: str = Field(
        ...,
        description="Stable machine slug identifying the consent document family",
        examples=["medical"],
    )
    version: int = Field(
        ...,
        description="Monotonically increasing version number within the slug",
        examples=[1],
    )
    body_md: str = Field(
        ...,
        description="Markdown body the user must read before accepting",
        examples=["Placeholder consent text — replace before production."],
    )
    created_at: datetime = Field(
        ...,
        description="UTC datetime when this version was created",
    )

    model_config = {"from_attributes": True}


class ConsentAcceptanceIn(BaseModel):
    consent_text_id: UUID = Field(
        ...,
        description=(
            "Identifier of the exact consent text version being accepted. Must match the "
            "current version for the slug, otherwise the request is rejected with 422."
        ),
        examples=["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
    )


class ConsentAcceptanceOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Identifier of the acceptance record",
        examples=["b2c3d4e5-f678-9012-bcde-f23456789012"],
    )
    slug: str = Field(
        ...,
        description="Slug of the accepted consent text",
        examples=["medical"],
    )
    version: int = Field(
        ...,
        description="Version of the accepted consent text",
        examples=[1],
    )
    accepted_at: datetime = Field(
        ...,
        description="UTC datetime when the user recorded their acceptance",
    )

    model_config = {"from_attributes": True}


class MyConsentOut(BaseModel):
    slug: str = Field(
        ...,
        description="Slug of the accepted consent family",
        examples=["medical"],
    )
    version: int = Field(
        ...,
        description="Version of the accepted consent text",
        examples=[1],
    )
    accepted_at: datetime = Field(
        ...,
        description="UTC datetime when the user accepted this version",
    )

    model_config = {"from_attributes": True}


class MyConsentsOut(BaseModel):
    consents: list[MyConsentOut] = Field(
        ...,
        description="Every consent the authenticated user has accepted, latest row per slug.",
    )
