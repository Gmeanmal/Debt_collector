from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class KinkCategory(SQLModel, table=True):
    __tablename__ = "kink_category"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    slug: str = Field(max_length=64, nullable=False, unique=True)
    label: str = Field(nullable=False)
    safety_flag: bool = Field(default=False, nullable=False)
    sort_order: int = Field(default=0, nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
