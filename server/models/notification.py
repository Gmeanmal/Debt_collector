from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class NotificationType(StrEnum):
    invitation_claimed = "invitation_claimed"
    payment_pending = "payment_pending"
    payment_validated = "payment_validated"
    payment_rejected = "payment_rejected"
    rolling_reminder = "rolling_reminder"
    rolling_late = "rolling_late"
    contract_proposed = "contract_proposed"
    contract_countered = "contract_countered"
    contract_counter_accepted = "contract_counter_accepted"
    contract_counter_rejected = "contract_counter_rejected"
    contract_signed = "contract_signed"
    contract_needs_resignature = "contract_needs_resignature"
    contract_period_interest = "contract_period_interest"
    contract_late_penalty = "contract_late_penalty"
    contract_surprise_penalty = "contract_surprise_penalty"
    contract_adjustment_proposed = "contract_adjustment_proposed"
    contract_adjustment_accepted = "contract_adjustment_accepted"
    contract_adjustment_refused = "contract_adjustment_refused"
    contract_buyout_requested = "contract_buyout_requested"
    contract_buyout_paid = "contract_buyout_paid"
    contract_breached = "contract_breached"
    contract_forgiven = "contract_forgiven"
    journal_comment = "journal_comment"
    wishlist_fulfilled = "wishlist_fulfilled"


class Notification(SQLModel, table=True):
    __tablename__ = "notification"
    __table_args__ = (Index("ix_notification_user_created_desc", "user_id", "created_at"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    type: NotificationType = Field(nullable=False)
    title: str = Field(nullable=False)
    body: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    link: str | None = Field(default=None, nullable=True)
    payload: dict[str, Any] | None = Field(default=None, sa_column=Column(JSONB, nullable=True))
    read_at: datetime | None = Field(default=None, nullable=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
        index=True,
    )
