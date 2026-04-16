"""i4_tribute_minimum_table

Revision ID: ebdad219f6a6
Revises: 54e414ed39e5
Create Date: 2026-04-16 20:46:37.988870

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "ebdad219f6a6"
down_revision: str | None = "54e414ed39e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# `create_type=False` because we emit CREATE TYPE … IF NOT EXISTS via op.execute
# to avoid Alembic trying to auto-create it again inside create_table.
_TRIBUTE_PERIOD = postgresql.ENUM(
    "weekly",
    "monthly",
    name="tributeperiod",
    create_type=False,
)


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tributeperiod') THEN "
        "    CREATE TYPE tributeperiod AS ENUM ('weekly', 'monthly'); "
        "  END IF; "
        "END $$"
    )
    op.create_table(
        "tribute_minimum",
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("period", _TRIBUTE_PERIOD, nullable=False),
        sa.Column(
            "grace_below_percent",
            sa.Numeric(precision=5, scale=4),
            server_default="0.8000",
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("sub_id"),
    )
    op.create_index(
        op.f("ix_tribute_minimum_goddess_id"),
        "tribute_minimum",
        ["goddess_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_tribute_minimum_goddess_id"), table_name="tribute_minimum")
    op.drop_table("tribute_minimum")
    op.execute("DROP TYPE IF EXISTS tributeperiod")
