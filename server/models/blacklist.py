from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Numeric
from sqlmodel import Field, SQLModel


class BlacklistEntry(SQLModel, table=True):
    __tablename__ = "blacklist_entry"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    goddess_id: UUID = Field(
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    sub_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    reason: str | None = Field(default=None, nullable=True)
    balance_snapshot: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    reinstatement_fee_paid: Decimal | None = Field(
        default=None,
        sa_column=Column(Numeric(12, 2), nullable=True),
    )
    breached_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    forgiven_at: datetime | None = Field(default=None, nullable=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
