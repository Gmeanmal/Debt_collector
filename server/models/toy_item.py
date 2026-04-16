from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, LargeBinary, Text
from sqlmodel import Field, SQLModel


class ToyCategory(StrEnum):
    restraint = "restraint"
    impact = "impact"
    vibrator = "vibrator"
    plug = "plug"
    cage = "cage"
    gag = "gag"
    clothing = "clothing"
    collar = "collar"
    other = "other"


class ToyProposedBy(StrEnum):
    sub = "sub"
    goddess = "goddess"


class ToyItem(SQLModel, table=True):
    __tablename__ = "toy_item"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    sub_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    goddess_id: UUID = Field(
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    category: ToyCategory = Field(nullable=False)
    name: str = Field(sa_column=Column(Text, nullable=False))
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    # Populated in phase B4 when R2 storage is wired.
    photo_r2_key: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    proposed_by: ToyProposedBy = Field(nullable=False)
    approved: bool = Field(default=False, nullable=False)
    # Column reserved for phase J (crypto envelope). No read/write path exposed yet.
    lock_code_enc: bytes | None = Field(
        default=None,
        sa_column=Column(LargeBinary, nullable=True),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
