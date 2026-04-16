from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SubMedicalUpdate(BaseModel):
    """Payload for a sub to create or update her own medical record. All fields are optional."""

    blood_type: str | None = Field(
        default=None,
        max_length=4000,
        description="Blood type in plain text. Pass null or empty string to clear the field.",
        examples=["A+"],
    )
    allergies: str | None = Field(
        default=None,
        max_length=4000,
        description="Known allergies in plain text. Pass null or empty string to clear.",
        examples=["Penicillin, latex"],
    )
    medications: str | None = Field(
        default=None,
        max_length=4000,
        description="Current medications in plain text. Pass null or empty string to clear.",
        examples=["Sertraline 50mg daily"],
    )
    emergency_contact: str | None = Field(
        default=None,
        max_length=4000,
        description="Emergency contact details in plain text. Pass null or empty string to clear.",
        examples=["Jane Doe — 07700 900000"],
    )
    medical_notes: str | None = Field(
        default=None,
        max_length=4000,
        description="Any additional medical notes. Pass null or empty string to clear.",
        examples=["Asthmatic — inhaler in left jacket pocket."],
    )

    model_config = {"str_strip_whitespace": True}


class SubMedicalSelfOut(BaseModel):
    """Read view for the sub — confirms what is stored without echoing plaintext."""

    blood_type_is_set: bool = Field(
        ...,
        description="True if a blood type has been stored.",
        examples=[True],
    )
    allergies_is_set: bool = Field(
        ...,
        description="True if allergies have been stored.",
        examples=[False],
    )
    medications_is_set: bool = Field(
        ...,
        description="True if medications have been stored.",
        examples=[True],
    )
    emergency_contact_is_set: bool = Field(
        ...,
        description="True if emergency contact details have been stored.",
        examples=[True],
    )
    medical_notes_is_set: bool = Field(
        ...,
        description="True if additional medical notes have been stored.",
        examples=[False],
    )
    updated_at: datetime = Field(
        ...,
        description="When this record was last modified (UTC).",
        examples=["2026-04-16T12:00:00"],
    )

    model_config = {"from_attributes": True}


class SubMedicalRevealOut(BaseModel):
    """Decrypted medical record returned exclusively to the goddess on reveal."""

    sub_id: UUID = Field(
        ...,
        description="UUID of the sub whose medical data is being revealed.",
        examples=["00000000-0000-0000-0000-000000000002"],
    )
    blood_type: str | None = Field(
        default=None,
        description="Decrypted blood type, or null if not set.",
        examples=["A+"],
    )
    allergies: str | None = Field(
        default=None,
        description="Decrypted allergies, or null if not set.",
        examples=["Penicillin, latex"],
    )
    medications: str | None = Field(
        default=None,
        description="Decrypted medications, or null if not set.",
        examples=["Sertraline 50mg daily"],
    )
    emergency_contact: str | None = Field(
        default=None,
        description="Decrypted emergency contact details, or null if not set.",
        examples=["Jane Doe — 07700 900000"],
    )
    medical_notes: str | None = Field(
        default=None,
        description="Decrypted additional medical notes, or null if not set.",
        examples=["Asthmatic — inhaler in left jacket pocket."],
    )
    updated_at: datetime = Field(
        ...,
        description="When this record was last modified (UTC).",
        examples=["2026-04-16T12:00:00"],
    )
