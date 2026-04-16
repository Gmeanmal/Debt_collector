from datetime import UTC, datetime
from uuid import UUID, uuid4

import sqlalchemy as sa
from sqlalchemy import Column, ForeignKey, Text
from sqlmodel import Field, SQLModel


class KinkItem(SQLModel, table=True):
    __tablename__ = "kink_item"

    __table_args__ = (sa.Index("uq_kink_item_slug_goddess", "slug", "goddess_id", unique=True),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    category_id: UUID = Field(
        sa_column=Column(
            ForeignKey("kink_category.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    goddess_id: UUID | None = Field(
        default=None,
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="RESTRICT"),
            nullable=True,
            index=True,
        ),
    )
    slug: str = Field(max_length=64, nullable=False)
    label: str = Field(nullable=False)
    description: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    safety_flag: bool = Field(default=False, nullable=False)
    is_custom: bool = Field(default=False, nullable=False)
    proposed_by: UUID | None = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    approved: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
