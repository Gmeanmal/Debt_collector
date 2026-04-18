from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID

from sqlmodel import Field, SQLModel


class OwnershipStatus(StrEnum):
    free = "free"
    owned = "owned"
    in_training = "in_training"
    collared = "collared"
    blackmailed = "blackmailed"
    released = "released"


class SubProfile(SQLModel, table=True):
    __tablename__ = "sub_profile"

    user_id: UUID = Field(
        foreign_key="user.id",
        primary_key=True,
        nullable=False,
        sa_column_kwargs={"onupdate": None},
    )
    real_name: str | None = Field(default=None, nullable=True)
    age: int | None = Field(default=None, nullable=True, ge=18)
    gender_id: UUID | None = Field(
        default=None,
        foreign_key="gender_taxonomy.id",
        nullable=True,
    )
    pronouns: str | None = Field(default=None, nullable=True, max_length=32)
    location: str | None = Field(default=None, nullable=True)
    timezone: str | None = Field(default=None, nullable=True)
    joined_empire_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    ownership_status: OwnershipStatus = Field(
        default=OwnershipStatus.free,
        nullable=False,
    )
    updated_at: datetime | None = Field(default=None, nullable=True)
