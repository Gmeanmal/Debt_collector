from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Numeric
from sqlmodel import Field, SQLModel

from models.user import AvatarKey


class ProfileChangeRequestStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    awaiting_fee_payment = "awaiting_fee_payment"
    cancelled = "cancelled"


class ProfileChangeRequest(SQLModel, table=True):
    __tablename__ = "profile_change_request"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    sub_id: UUID = Field(
        sa_column=Column(ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    requested_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None), nullable=False
    )
    status: ProfileChangeRequestStatus = Field(
        default=ProfileChangeRequestStatus.pending, nullable=False, index=True
    )

    proposed_first_name: str | None = Field(default=None, nullable=True)
    proposed_last_name: str | None = Field(default=None, nullable=True)
    proposed_display_name: str | None = Field(default=None, nullable=True)
    proposed_notes: str | None = Field(default=None, nullable=True)
    proposed_avatar_key: AvatarKey | None = Field(default=None, nullable=True)

    fee_amount: Decimal | None = Field(
        default=None,
        sa_column=Column(Numeric(12, 2), nullable=True),
    )
    fee_payment_id: UUID | None = Field(
        default=None,
        sa_column=Column(ForeignKey("payment_declaration.id", ondelete="SET NULL"), nullable=True),
    )

    resolved_at: datetime | None = Field(default=None, nullable=True)
    resolution_note: str | None = Field(default=None, nullable=True)
