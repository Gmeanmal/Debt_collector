from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import Column, ForeignKey, Text
from sqlmodel import Field, SQLModel


class SubSafeword(SQLModel, table=True):
    __tablename__ = "sub_safeword"

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
    word: str = Field(sa_column=Column(Text, nullable=False))
    signal: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    emergency_contact_name: str | None = Field(default=None, nullable=True)
    emergency_contact_phone: str | None = Field(default=None, nullable=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
