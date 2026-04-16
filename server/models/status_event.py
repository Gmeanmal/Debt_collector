from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Text
from sqlmodel import Field, SQLModel

from models.sub_profile import OwnershipStatus


class StatusEvent(SQLModel, table=True):
    __tablename__ = "status_event"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    sub_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
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
    from_status: OwnershipStatus = Field(nullable=False)
    to_status: OwnershipStatus = Field(nullable=False)
    reason: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    created_by: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="RESTRICT"),
            nullable=False,
        )
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
