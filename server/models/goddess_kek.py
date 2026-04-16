from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, LargeBinary
from sqlmodel import Field, SQLModel


class GoddessKek(SQLModel, table=True):
    __tablename__ = "goddess_kek"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    goddess_id: UUID = Field(
        sa_column=Column(
            ForeignKey("goddess.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
            index=True,
        )
    )
    wrapped_dek: bytes = Field(sa_column=Column(LargeBinary, nullable=False))
    root_kek_version: int = Field(nullable=False)
    nonce: bytes = Field(sa_column=Column(LargeBinary, nullable=False))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    rotated_at: datetime | None = Field(default=None, nullable=True)
