from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class GenderTaxonomy(SQLModel, table=True):
    __tablename__ = "gender_taxonomy"

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    slug: str = Field(nullable=False, unique=True, index=True)
    label: str = Field(nullable=False)
    description: str | None = Field(default=None, nullable=True)
    sort_order: int = Field(nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
