from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import Column, ForeignKey, LargeBinary, Text
from sqlmodel import Field, SQLModel


class ThroneConnection(SQLModel, table=True):
    __tablename__ = "throne_connection"

    goddess_id: UUID = Field(
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="RESTRICT"),
            primary_key=True,
            nullable=False,
        )
    )
    account_id: str = Field(sa_column=Column(Text, nullable=False))
    access_token_enc: bytes = Field(sa_column=Column(LargeBinary, nullable=False))
    access_token_last4: str = Field(sa_column=Column(Text, nullable=False))
    # Tracks which goddess KEK generation wrapped the token; supports rotation in J3+.
    dek_version: int = Field(default=1, nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
