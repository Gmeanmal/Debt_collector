from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class AdminAction(SQLModel, table=True):
    __tablename__ = "admin_action"
    __table_args__ = (
        Index("ix_admin_action_admin_id", "admin_id"),
        Index("ix_admin_action_created_at", "created_at"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    admin_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    acting_as_user_id: UUID | None = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    action: str = Field(sa_column=Column(String(64), nullable=False))
    entity: str | None = Field(default=None, sa_column=Column(String(64), nullable=True))
    entity_id: UUID | None = Field(default=None, nullable=True)
    payload_json: dict[str, Any] | None = Field(
        default=None, sa_column=Column(JSONB, nullable=True)
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
