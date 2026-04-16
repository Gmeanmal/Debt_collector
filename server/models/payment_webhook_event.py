from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class PaymentWebhookProvider(StrEnum):
    throne = "throne"
    paypal = "paypal"
    revolut = "revolut"
    cashapp = "cashapp"


class PaymentWebhookResult(StrEnum):
    pending = "pending"
    matched = "matched"
    unmatched = "unmatched"
    duplicate = "duplicate"
    error = "error"


class PaymentWebhookEvent(SQLModel, table=True):
    __tablename__ = "payment_webhook_event"
    __table_args__ = (
        UniqueConstraint("provider", "provider_event_id", name="uq_webhook_event_provider_id"),
        Index("ix_webhook_event_goddess_id", "goddess_id"),
        Index("ix_webhook_event_result", "result"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    provider: PaymentWebhookProvider = Field(nullable=False)
    provider_event_id: str = Field(nullable=False, max_length=255)
    received_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    payload_json: dict = Field(  # type: ignore[type-arg]
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
    signature_verified: bool = Field(default=False, nullable=False)
    result: PaymentWebhookResult = Field(
        default=PaymentWebhookResult.pending,
        nullable=False,
    )
    matched_declaration_id: UUID | None = Field(
        default=None,
        sa_column=Column(
            ForeignKey("payment_declaration.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    error_message: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    goddess_id: UUID | None = Field(
        default=None,
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
