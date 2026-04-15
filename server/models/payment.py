from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Index, Numeric, UniqueConstraint
from sqlmodel import Field, SQLModel


class DeclarationSource(StrEnum):
    sub_declared = "sub_declared"
    goddess_recorded = "goddess_recorded"


class PaymentCategory(StrEnum):
    entry = "entry"
    rolling = "rolling"
    weekly_debt = "weekly_debt"
    debt_payment = "debt_payment"
    buyout = "buyout"
    tribute = "tribute"
    profile_change_fee = "profile_change_fee"


class PaymentStatus(StrEnum):
    pending = "pending"
    validated = "validated"
    rejected = "rejected"
    cancelled = "cancelled"


class AllocationTargetType(StrEnum):
    entry = "entry"
    rolling_cycle = "rolling_cycle"
    contract_debt = "contract_debt"
    contract_buyout = "contract_buyout"
    tribute = "tribute"


class PaymentDeclaration(SQLModel, table=True):
    __tablename__ = "payment_declaration"
    __table_args__ = (
        Index("ix_payment_declaration_sub_status", "sub_id", "status"),
        Index("ix_payment_declaration_goddess_status", "goddess_id", "status"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    sub_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="RESTRICT"),
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
    method_id: UUID = Field(
        sa_column=Column(
            ForeignKey("payment_method.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    amount: float = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    external_timestamp: datetime | None = Field(default=None, nullable=True)
    note: str | None = Field(default=None, nullable=True)
    category: PaymentCategory = Field(nullable=False)
    status: PaymentStatus = Field(default=PaymentStatus.pending, nullable=False)
    target_id: UUID | None = Field(default=None, nullable=True)
    created_by: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="RESTRICT"),
            nullable=False,
        )
    )
    declared_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    validated_at: datetime | None = Field(default=None, nullable=True)
    validated_by: UUID | None = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="RESTRICT"),
            nullable=True,
        )
    )
    rejection_reason: str | None = Field(default=None, nullable=True)
    source: DeclarationSource = Field(
        default=DeclarationSource.sub_declared,
        nullable=False,
        index=True,
    )


class PaymentAllocation(SQLModel, table=True):
    __tablename__ = "payment_allocation"
    __table_args__ = (UniqueConstraint("declaration_id", name="uq_payment_allocation_declaration"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    declaration_id: UUID = Field(
        sa_column=Column(
            ForeignKey("payment_declaration.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    target_type: AllocationTargetType = Field(nullable=False)
    target_id: UUID | None = Field(default=None, nullable=True)
    amount: float = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    allocated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
