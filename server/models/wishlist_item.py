from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Numeric, Text
from sqlmodel import Field, SQLModel


class WishlistCreatedBy(StrEnum):
    goddess = "goddess"
    sub = "sub"


class WishlistStatus(StrEnum):
    cancelled = "cancelled"
    fulfilled = "fulfilled"
    open = "open"


class WishlistItem(SQLModel, table=True):
    __tablename__ = "wishlist_item"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    goddess_id: UUID = Field(
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    sub_id: UUID | None = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
    )
    title: str = Field(sa_column=Column(Text, nullable=False))
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    image_url: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    external_url: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    target_amount: Decimal = Field(
        sa_column=Column(Numeric(12, 2), nullable=False),
    )
    status: WishlistStatus = Field(default=WishlistStatus.open, nullable=False)
    created_by: WishlistCreatedBy = Field(nullable=False)
    approved: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    fulfilled_at: datetime | None = Field(default=None, nullable=True)
