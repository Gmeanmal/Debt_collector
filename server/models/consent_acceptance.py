from datetime import UTC, datetime
from uuid import UUID, uuid4

import sqlalchemy as sa
from sqlalchemy import Column, ForeignKey, Text
from sqlmodel import Field, SQLModel


class ConsentAcceptance(SQLModel, table=True):
    __tablename__ = "consent_acceptance"

    __table_args__ = (
        sa.UniqueConstraint(
            "user_id",
            "consent_text_id",
            name="uq_consent_acceptance_user_consent",
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(
        sa_column=Column(
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    consent_text_id: UUID = Field(
        sa_column=Column(
            ForeignKey("consent_text.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    accepted_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    ip_address: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
