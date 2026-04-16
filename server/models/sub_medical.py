# Read/write path deferred to roadmap J4; controller + DAO will arrive with the envelope activation.
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import Column, ForeignKey, LargeBinary
from sqlmodel import Field, SQLModel


class SubMedical(SQLModel, table=True):
    __tablename__ = "sub_medical"

    sub_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        )
    )
    goddess_id: UUID = Field(
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    # Tracks which goddess KEK generation wrapped the field-level DEKs; supports J4 rotation.
    dek_version: int = Field(default=1, nullable=False)
    blood_type_enc: bytes | None = Field(default=None, sa_column=Column(LargeBinary, nullable=True))
    allergies_enc: bytes | None = Field(default=None, sa_column=Column(LargeBinary, nullable=True))
    medications_enc: bytes | None = Field(
        default=None, sa_column=Column(LargeBinary, nullable=True)
    )
    emergency_contact_enc: bytes | None = Field(
        default=None, sa_column=Column(LargeBinary, nullable=True)
    )
    medical_notes_enc: bytes | None = Field(
        default=None, sa_column=Column(LargeBinary, nullable=True)
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
