from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Text
from sqlmodel import Field, SQLModel


class PushSubscription(SQLModel, table=True):
    __tablename__ = "push_subscription"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    endpoint: str = Field(sa_column=Column(Text, nullable=False, unique=True))
    p256dh: str = Field(nullable=False)
    auth: str = Field(nullable=False)
    user_agent: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
        index=True,
    )
