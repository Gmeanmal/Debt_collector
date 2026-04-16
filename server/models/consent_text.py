from datetime import UTC, datetime
from uuid import UUID, uuid4

import sqlalchemy as sa
from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel


class ConsentText(SQLModel, table=True):
    __tablename__ = "consent_text"

    __table_args__ = (sa.UniqueConstraint("slug", "version", name="uq_consent_text_slug_version"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    slug: str = Field(sa_column=Column(Text, nullable=False, index=True))
    version: int = Field(nullable=False)
    body_md: str = Field(sa_column=Column(Text, nullable=False))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
