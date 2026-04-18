from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class CronRun(SQLModel, table=True):
    __tablename__ = "cron_run"
    __table_args__ = (Index("ix_cron_run_started_at", "started_at"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    started_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC).replace(tzinfo=None),
        nullable=False,
    )
    finished_at: datetime | None = Field(default=None, nullable=True)
    dry_run: bool = Field(nullable=False)
    summary_json: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default=text("'{}'::jsonb")),
    )
    errors: list[dict[str, Any]] = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default=text("'[]'::jsonb")),
    )
    triggered_by_user_id: UUID | None = Field(
        default=None,
        sa_column=Column(
            ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    duration_ms: int | None = Field(default=None, nullable=True)
