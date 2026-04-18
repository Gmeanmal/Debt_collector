from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer, Text
from sqlmodel import Field, SQLModel


class SubAftercare(SQLModel, table=True):
    __tablename__ = "sub_aftercare"
    __table_args__ = (CheckConstraint("intensity BETWEEN 1 AND 5", name="ck_aftercare_intensity"),)

    sub_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        )
    )
    needs: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    comfort_items: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    contact_phrase: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    notes: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    intensity: int = Field(
        default=3,
        sa_column=Column(Integer, nullable=False, server_default="3"),
    )
    read_by_goddess_at: datetime | None = Field(
        default=None,
        nullable=True,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
