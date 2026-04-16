from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Index, Numeric, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class InterestPeriod(StrEnum):
    monthly = "monthly"
    yearly = "yearly"


class PaymentFrequency(StrEnum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"


class LatePenaltySeverity(StrEnum):
    light = "light"
    medium = "medium"
    severe = "severe"


class RenewalPolicy(StrEnum):
    none = "none"
    reminder = "reminder"
    auto_extend = "auto_extend"


class MidContractAdditionMode(StrEnum):
    disabled = "disabled"
    dom_controlled = "dom_controlled"
    sub_approval_required = "sub_approval_required"


class DebtContractStatus(StrEnum):
    pending_sub = "pending_sub"
    pending_dom = "pending_dom"
    pending_dom_counter = "pending_dom_counter"
    pending_sub_signature = "pending_sub_signature"
    active = "active"
    closed = "closed"
    breached = "breached"
    completed = "completed"
    cancelled_by_dom = "cancelled_by_dom"


class DebtContractEventType(StrEnum):
    proposed = "proposed"
    countered = "countered"
    accepted_counter = "accepted_counter"
    rejected_counter = "rejected_counter"
    signed = "signed"
    cancelled = "cancelled"
    closed = "closed"
    breached = "breached"
    completed = "completed"
    clauses_changed = "clauses_changed"


class DebtContract(SQLModel, table=True):
    __tablename__ = "debt_contract"
    __table_args__ = (
        Index("ix_debt_contract_sub_status", "sub_id", "status"),
        Index("ix_debt_contract_goddess_status", "goddess_id", "status"),
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
    sub_initiated: bool = Field(default=False, nullable=False)
    principal: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    interest_rate: Decimal = Field(sa_column=Column(Numeric(8, 6), nullable=False))
    interest_period: InterestPeriod = Field(nullable=False)
    duration_periods: int = Field(nullable=False)
    payment_frequency: PaymentFrequency = Field(nullable=False)
    minimum_payment: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    late_penalty_severity: LatePenaltySeverity = Field(nullable=False)
    late_penalty_percent: Decimal = Field(sa_column=Column(Numeric(5, 4), nullable=False))
    dom_can_add_surprise_penalty: bool = Field(default=False, nullable=False)
    mid_contract_addition_mode: MidContractAdditionMode = Field(nullable=False)
    exit_amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    status: DebtContractStatus = Field(nullable=False)
    # use_alter so this FK is created after debt_contract_version exists
    current_version_id: UUID | None = Field(
        default=None,
        sa_column=Column(
            ForeignKey(
                "debt_contract_version.id",
                ondelete="SET NULL",
                use_alter=True,
                name="fk_debt_contract_current_version",
            ),
            nullable=True,
        ),
    )
    # Raw base64 data URI of the sub's signature PNG (e.g. "data:image/png;base64,…").
    # The PDF is generated on-the-fly from this value; nothing is persisted to object storage.
    signature_b64: str | None = Field(default=None, nullable=True, sa_type=Text)
    signed_at: datetime | None = Field(default=None, nullable=True)
    balance: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    clauses_json: list[dict[str, object]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="'[]'::jsonb"),
    )
    review_at: datetime | None = Field(default=None, nullable=True)
    renewal_policy: RenewalPolicy = Field(
        default=RenewalPolicy.none,
        sa_column=Column(
            Text,
            nullable=False,
            server_default=RenewalPolicy.none,
        ),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )


class DebtContractVersion(SQLModel, table=True):
    __tablename__ = "debt_contract_version"
    __table_args__ = (
        UniqueConstraint("contract_id", "round_no", name="uq_debt_contract_version_round"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    contract_id: UUID = Field(
        sa_column=Column(
            ForeignKey("debt_contract.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    round_no: int = Field(nullable=False)
    proposed_by: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="RESTRICT"),
            nullable=False,
        )
    )
    proposed_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    principal: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    interest_rate: Decimal = Field(sa_column=Column(Numeric(8, 6), nullable=False))
    interest_period: InterestPeriod = Field(nullable=False)
    duration_periods: int = Field(nullable=False)
    payment_frequency: PaymentFrequency = Field(nullable=False)
    minimum_payment: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    late_penalty_severity: LatePenaltySeverity = Field(nullable=False)
    late_penalty_percent: Decimal = Field(sa_column=Column(Numeric(5, 4), nullable=False))
    dom_can_add_surprise_penalty: bool = Field(default=False, nullable=False)
    mid_contract_addition_mode: MidContractAdditionMode = Field(nullable=False)
    exit_amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))


class DebtContractAudit(SQLModel, table=True):
    __tablename__ = "debt_contract_audit"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    contract_id: UUID = Field(
        sa_column=Column(
            ForeignKey("debt_contract.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    event_type: DebtContractEventType = Field(nullable=False)
    actor_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="RESTRICT"),
            nullable=False,
        )
    )
    from_status: DebtContractStatus | None = Field(default=None, nullable=True)
    to_status: DebtContractStatus | None = Field(default=None, nullable=True)
    note: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
