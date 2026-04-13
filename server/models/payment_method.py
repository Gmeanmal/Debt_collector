from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Text
from sqlmodel import Field, SQLModel


class PaymentMethodType(StrEnum):
    throne = "throne"
    paypal = "paypal"
    bank = "bank"
    other = "other"


class PaymentMethod(SQLModel, table=True):
    __tablename__ = "payment_method"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    goddess_id: UUID = Field(
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    name: str = Field(nullable=False)
    type: PaymentMethodType = Field(nullable=False, index=True)
    handle_or_link: str = Field(nullable=False)
    note: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    enabled: bool = Field(default=True, nullable=False)
    sort_order: int = Field(default=0, nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
