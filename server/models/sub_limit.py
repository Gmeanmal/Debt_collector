from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Text
from sqlmodel import Field, SQLModel


class LimitKind(StrEnum):
    hard = "hard"
    soft = "soft"


class LimitSeverity(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class SubLimit(SQLModel, table=True):
    __tablename__ = "sub_limit"

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
    kind: LimitKind = Field(nullable=False)
    body: str = Field(sa_column=Column(Text, nullable=False))
    severity: LimitSeverity = Field(nullable=False)
    acknowledged_by_goddess_at: datetime | None = Field(default=None, nullable=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
