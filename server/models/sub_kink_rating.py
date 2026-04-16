from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

import sqlalchemy as sa
from sqlalchemy import Column, ForeignKey, Text
from sqlmodel import Field, SQLModel


class KinkRating(StrEnum):
    hard_limit = "hard_limit"
    soft_limit = "soft_limit"
    curious = "curious"
    loves = "loves"
    fetish_need = "fetish_need"
    not_set = "not_set"


class SubKinkRating(SQLModel, table=True):
    __tablename__ = "sub_kink_rating"

    __table_args__ = (sa.UniqueConstraint("sub_id", "item_id", name="uq_sub_kink_rating_sub_item"),)

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
    item_id: UUID = Field(
        sa_column=Column(
            ForeignKey("kink_item.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    rating: KinkRating = Field(nullable=False)
    note: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
