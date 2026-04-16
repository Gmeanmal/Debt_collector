"""f3_merit_event_table

Revision ID: 5d8b09d4be39
Revises: ebdad219f6a6
Create Date: 2026-04-16 20:56:17.595455

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "5d8b09d4be39"
down_revision: str | None = "ebdad219f6a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_MERIT_SOURCE_KIND = postgresql.ENUM(
    "ritual_complete",
    "ritual_miss",
    "task_complete",
    "task_miss",
    "manual",
    name="meritsourcekind",
    create_type=False,
)


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meritsourcekind') THEN "
        "    CREATE TYPE meritsourcekind AS ENUM "
        "      ('ritual_complete', 'ritual_miss', 'task_complete', 'task_miss', 'manual'); "
        "  END IF; "
        "END $$"
    )
    op.create_table(
        "merit_event",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("source_kind", _MERIT_SOURCE_KIND, nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=True),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_merit_event_created_at"), "merit_event", ["created_at"], unique=False)
    op.create_index(op.f("ix_merit_event_goddess_id"), "merit_event", ["goddess_id"], unique=False)
    op.create_index(op.f("ix_merit_event_source_id"), "merit_event", ["source_id"], unique=False)
    op.create_index(
        op.f("ix_merit_event_source_kind"), "merit_event", ["source_kind"], unique=False
    )
    op.create_index(op.f("ix_merit_event_sub_id"), "merit_event", ["sub_id"], unique=False)
    op.create_index(
        "uq_merit_event_source",
        "merit_event",
        ["source_kind", "source_id"],
        unique=True,
        postgresql_where="source_id IS NOT NULL",
    )


def downgrade() -> None:
    op.drop_index(
        "uq_merit_event_source",
        table_name="merit_event",
        postgresql_where="source_id IS NOT NULL",
    )
    op.drop_index(op.f("ix_merit_event_sub_id"), table_name="merit_event")
    op.drop_index(op.f("ix_merit_event_source_kind"), table_name="merit_event")
    op.drop_index(op.f("ix_merit_event_source_id"), table_name="merit_event")
    op.drop_index(op.f("ix_merit_event_goddess_id"), table_name="merit_event")
    op.drop_index(op.f("ix_merit_event_created_at"), table_name="merit_event")
    op.drop_table("merit_event")
    op.execute("DROP TYPE IF EXISTS meritsourcekind")
