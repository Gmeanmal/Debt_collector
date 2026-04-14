from datetime import datetime, time
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from models.adjustment import AdjustmentStatus
from models.debt import (
    DebtContractStatus,
    InterestPeriod,
    LatePenaltySeverity,
    MidContractAdditionMode,
    PaymentFrequency,
)
from models.debt_event import EventType
from models.notification import NotificationType
from models.payment import DeclarationSource, PaymentCategory, PaymentStatus
from models.payment_method import PaymentMethodType
from models.rolling import DeadlineDay
from models.user import UserRole, UserStatus


class AdminListOut[RowT: BaseModel](BaseModel):
    items: list[RowT] = Field(..., description="Rows for the current page", examples=[[]])
    total: int = Field(..., description="Total row count matching the query", examples=[0])
    page: int = Field(..., description="1-based page index", examples=[1])
    page_size: int = Field(..., description="Maximum rows per page", examples=[50])


class AdminRowUser(BaseModel):
    id: UUID = Field(
        ..., description="Primary key", examples=["00000000-0000-0000-0000-000000000001"]
    )
    goddess_id: UUID | None = Field(None, description="Owning goddess FK", examples=[None])
    username: str = Field(..., description="Unique login handle", examples=["alice"])
    email: str = Field(..., description="Email address", examples=["alice@example.com"])
    password_hash: str = Field(
        ..., description="Bcrypt hash — never display to users", examples=["$2b$12$..."]
    )
    role: UserRole = Field(..., description="User role", examples=["sub"])
    status: UserStatus = Field(..., description="Account status", examples=["active"])
    first_name: str | None = Field(None, description="Given name", examples=["Alice"])
    last_name: str | None = Field(None, description="Family name", examples=["Smith"])
    twitter_handle: str | None = Field(None, description="Twitter/X handle", examples=["@alice"])
    source_note: str | None = Field(
        None, description="Acquisition note", examples=["referred by Bob"]
    )
    avatar_url: str | None = Field(
        None, description="Avatar image URL", examples=["https://cdn.example.com/alice.jpg"]
    )
    bio: str | None = Field(None, description="User bio", examples=["Hello world"])
    theme_preference: str = Field(..., description="UI theme key", examples=["system"])
    last_login_at: datetime | None = Field(
        None, description="Last successful login (UTC)", examples=[None]
    )
    created_at: datetime = Field(
        ..., description="Row creation timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )


class AdminRowGoddess(BaseModel):
    id: UUID = Field(
        ..., description="Primary key", examples=["00000000-0000-0000-0000-000000000002"]
    )
    display_name: str = Field(..., description="Public display name", examples=["Lady X"])
    email: str = Field(..., description="Login email", examples=["goddess@example.com"])
    password_hash: str = Field(..., description="Bcrypt hash", examples=["$2b$12$..."])
    created_at: datetime = Field(
        ..., description="Row creation timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )


class AdminRowInvitation(BaseModel):
    id: UUID = Field(
        ..., description="Primary key", examples=["00000000-0000-0000-0000-000000000003"]
    )
    token: str = Field(..., description="Unique invite token", examples=["abc123"])
    goddess_id: UUID = Field(
        ..., description="Issuing goddess FK", examples=["00000000-0000-0000-0000-000000000002"]
    )
    entry_tribute_amount: Decimal = Field(
        ..., description="Required entry tribute in GBP", examples=["50.00"]
    )
    note: str | None = Field(
        None, description="Optional note for the invitee", examples=["Welcome!"]
    )
    expires_at: datetime = Field(
        ..., description="Expiry timestamp (UTC)", examples=["2026-06-01T00:00:00"]
    )
    used_at: datetime | None = Field(
        None, description="When the token was claimed (UTC)", examples=[None]
    )
    used_by_user_id: UUID | None = Field(
        None, description="User who claimed the invitation", examples=[None]
    )
    created_at: datetime = Field(
        ..., description="Row creation timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )


class AdminRowPaymentMethod(BaseModel):
    id: UUID = Field(
        ..., description="Primary key", examples=["00000000-0000-0000-0000-000000000004"]
    )
    goddess_id: UUID = Field(
        ..., description="Owning goddess FK", examples=["00000000-0000-0000-0000-000000000002"]
    )
    name: str = Field(..., description="Display label", examples=["PayPal"])
    type: PaymentMethodType = Field(..., description="Method type enum", examples=["paypal"])
    handle_or_link: str = Field(
        ..., description="Payment handle or URL", examples=["goddess@paypal.com"]
    )
    note: str | None = Field(
        None, description="Optional instructions", examples=["Friends & Family only"]
    )
    enabled: bool = Field(..., description="Whether the method is active", examples=[True])
    sort_order: int = Field(..., description="Display ordering index", examples=[0])
    created_at: datetime = Field(
        ..., description="Row creation timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )
    updated_at: datetime = Field(
        ..., description="Last modification timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )


class AdminRowPaymentDeclaration(BaseModel):
    id: UUID = Field(
        ..., description="Primary key", examples=["00000000-0000-0000-0000-000000000005"]
    )
    sub_id: UUID = Field(
        ..., description="Declaring sub FK", examples=["00000000-0000-0000-0000-000000000001"]
    )
    goddess_id: UUID = Field(
        ..., description="Receiving goddess FK", examples=["00000000-0000-0000-0000-000000000002"]
    )
    method_id: UUID = Field(
        ..., description="Payment method FK", examples=["00000000-0000-0000-0000-000000000004"]
    )
    amount: float = Field(..., description="Declared amount in GBP", examples=[25.0])
    external_timestamp: datetime | None = Field(
        None, description="When the transfer was made (UTC)", examples=[None]
    )
    note: str | None = Field(
        None, description="Sub's note for the goddess", examples=["Weekly tribute"]
    )
    category: PaymentCategory = Field(
        ..., description="Payment category enum", examples=["rolling"]
    )
    status: PaymentStatus = Field(..., description="Declaration status enum", examples=["pending"])
    target_id: UUID | None = Field(
        None, description="Optional allocation target FK", examples=[None]
    )
    created_by: UUID = Field(
        ...,
        description="User who created the record",
        examples=["00000000-0000-0000-0000-000000000001"],
    )
    declared_at: datetime = Field(
        ..., description="Declaration timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )
    validated_at: datetime | None = Field(
        None, description="Validation timestamp (UTC)", examples=[None]
    )
    validated_by: UUID | None = Field(None, description="Goddess who validated", examples=[None])
    rejection_reason: str | None = Field(None, description="Reason if rejected", examples=[None])
    source: DeclarationSource = Field(
        ..., description="Who originated the declaration", examples=["sub_declared"]
    )


class AdminRowRollingTribute(BaseModel):
    id: UUID = Field(
        ..., description="Primary key", examples=["00000000-0000-0000-0000-000000000006"]
    )
    sub_id: UUID = Field(
        ..., description="Subject sub FK", examples=["00000000-0000-0000-0000-000000000001"]
    )
    goddess_id: UUID = Field(
        ..., description="Receiving goddess FK", examples=["00000000-0000-0000-0000-000000000002"]
    )
    amount: float = Field(..., description="Weekly tribute amount in GBP", examples=[10.0])
    deadline_day: DeadlineDay = Field(
        ..., description="Day of week the payment is due", examples=["fri"]
    )
    deadline_time: time = Field(
        ..., description="Time of day the payment is due (UTC)", examples=["23:59:00"]
    )
    late_multiplier_per_day: int = Field(
        ..., description="Extra amount multiplier per day late", examples=[1]
    )
    paused: bool = Field(..., description="Whether the schedule is paused", examples=[False])
    notes: str | None = Field(None, description="Admin/goddess notes", examples=[None])
    last_paid_at: datetime | None = Field(
        None, description="Last successful payment timestamp (UTC)", examples=[None]
    )
    created_at: datetime = Field(
        ..., description="Row creation timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )
    updated_at: datetime = Field(
        ..., description="Last modification timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )


class AdminRowDebtContract(BaseModel):
    id: UUID = Field(
        ..., description="Primary key", examples=["00000000-0000-0000-0000-000000000007"]
    )
    sub_id: UUID = Field(
        ..., description="Debtor sub FK", examples=["00000000-0000-0000-0000-000000000001"]
    )
    goddess_id: UUID = Field(
        ..., description="Creditor goddess FK", examples=["00000000-0000-0000-0000-000000000002"]
    )
    sub_initiated: bool = Field(
        ..., description="Whether the sub proposed the contract", examples=[False]
    )
    principal: Decimal = Field(..., description="Original loan amount in GBP", examples=["500.00"])
    interest_rate: Decimal = Field(
        ..., description="Interest rate (e.g. 0.05 = 5%)", examples=["0.050000"]
    )
    interest_period: InterestPeriod = Field(
        ..., description="Compounding period", examples=["monthly"]
    )
    duration_periods: int = Field(..., description="Number of payment periods", examples=[12])
    payment_frequency: PaymentFrequency = Field(
        ..., description="How often payments are due", examples=["weekly"]
    )
    minimum_payment: Decimal = Field(
        ..., description="Minimum payment amount in GBP", examples=["50.00"]
    )
    late_penalty_severity: LatePenaltySeverity = Field(
        ..., description="Severity tier of late penalties", examples=["medium"]
    )
    late_penalty_percent: Decimal = Field(
        ..., description="Late penalty rate (e.g. 0.02 = 2%)", examples=["0.0200"]
    )
    dom_can_add_surprise_penalty: bool = Field(
        ..., description="Whether goddess may add surprise penalties", examples=[False]
    )
    mid_contract_addition_mode: MidContractAdditionMode = Field(
        ..., description="Policy for mid-contract debt additions", examples=["disabled"]
    )
    exit_amount: Decimal = Field(..., description="Buyout amount in GBP", examples=["450.00"])
    status: DebtContractStatus = Field(
        ..., description="Contract lifecycle status", examples=["active"]
    )
    current_version_id: UUID | None = Field(
        None, description="FK to latest negotiation version", examples=[None]
    )
    signed_pdf_url: str | None = Field(
        None, description="URL to signed contract PDF", examples=[None]
    )
    signed_pdf_sha256: str | None = Field(
        None, description="SHA-256 of the signed PDF", examples=[None]
    )
    signed_at: datetime | None = Field(
        None, description="Signature timestamp (UTC)", examples=[None]
    )
    balance: Decimal = Field(
        ..., description="Current outstanding balance in GBP", examples=["380.00"]
    )
    created_at: datetime = Field(
        ..., description="Row creation timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )
    updated_at: datetime = Field(
        ..., description="Last modification timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )


class AdminRowBlacklistEntry(BaseModel):
    id: UUID = Field(
        ..., description="Primary key", examples=["00000000-0000-0000-0000-000000000008"]
    )
    goddess_id: UUID = Field(
        ...,
        description="Blacklisting goddess FK",
        examples=["00000000-0000-0000-0000-000000000002"],
    )
    sub_id: UUID = Field(
        ..., description="Blacklisted sub FK", examples=["00000000-0000-0000-0000-000000000001"]
    )
    reason: str | None = Field(
        None, description="Reason for blacklisting", examples=["Repeated non-payment"]
    )
    balance_snapshot: Decimal = Field(
        ..., description="Outstanding balance at breach time in GBP", examples=["120.00"]
    )
    reinstatement_fee_paid: Decimal | None = Field(
        None, description="Fee paid to reinstate (GBP)", examples=[None]
    )
    breached_at: datetime = Field(
        ..., description="Breach timestamp (UTC)", examples=["2026-01-15T00:00:00"]
    )
    forgiven_at: datetime | None = Field(
        None, description="Forgiveness timestamp if reinstated (UTC)", examples=[None]
    )
    created_at: datetime = Field(
        ..., description="Row creation timestamp (UTC)", examples=["2026-01-15T00:00:00"]
    )


class AdminRowNotification(BaseModel):
    id: UUID = Field(
        ..., description="Primary key", examples=["00000000-0000-0000-0000-000000000009"]
    )
    user_id: UUID = Field(
        ..., description="Recipient user FK", examples=["00000000-0000-0000-0000-000000000001"]
    )
    type: NotificationType = Field(
        ..., description="Notification type enum", examples=["payment_pending"]
    )
    title: str = Field(
        ..., description="Short notification title", examples=["Payment pending validation"]
    )
    body: str | None = Field(
        None,
        description="Notification body text",
        examples=["Your £25 tribute is awaiting goddess review."],
    )
    link: str | None = Field(
        None, description="Optional deep-link path", examples=["/payments/abc123"]
    )
    payload: dict[str, Any] | None = Field(
        None, description="Structured event payload (JSONB)", examples=[None]
    )
    read_at: datetime | None = Field(
        None, description="When the notification was read (UTC)", examples=[None]
    )
    created_at: datetime = Field(
        ..., description="Row creation timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )


class AdminRowDebtEvent(BaseModel):
    id: UUID = Field(
        ..., description="Primary key", examples=["00000000-0000-0000-0000-00000000000a"]
    )
    contract_id: UUID = Field(
        ..., description="Parent contract FK", examples=["00000000-0000-0000-0000-000000000007"]
    )
    event_type: EventType = Field(..., description="Event type enum", examples=["period_interest"])
    amount: Decimal = Field(..., description="Amount applied in GBP", examples=["12.5000"])
    period_index: int | None = Field(
        None, description="Payment period index if applicable", examples=[1]
    )
    note: str | None = Field(None, description="Optional admin note", examples=[None])
    created_at: datetime = Field(
        ..., description="Row creation timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )


class AdminRowContractAdjustment(BaseModel):
    id: UUID = Field(
        ..., description="Primary key", examples=["00000000-0000-0000-0000-00000000000b"]
    )
    contract_id: UUID = Field(
        ..., description="Parent contract FK", examples=["00000000-0000-0000-0000-000000000007"]
    )
    proposed_by: UUID = Field(
        ...,
        description="User who proposed the adjustment",
        examples=["00000000-0000-0000-0000-000000000002"],
    )
    amount: Decimal = Field(
        ..., description="Adjustment amount in GBP (negative = forgiveness)", examples=["50.00"]
    )
    reason: str | None = Field(
        None, description="Reason for the adjustment", examples=["Goodwill discount"]
    )
    status: AdjustmentStatus = Field(
        ..., description="Adjustment lifecycle status", examples=["applied"]
    )
    created_at: datetime = Field(
        ..., description="Row creation timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )
    updated_at: datetime = Field(
        ..., description="Last modification timestamp (UTC)", examples=["2026-01-01T00:00:00"]
    )
    resolved_at: datetime | None = Field(
        None, description="Resolution timestamp (UTC)", examples=[None]
    )
