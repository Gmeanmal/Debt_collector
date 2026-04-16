"""b3 status_event table

Revision ID: cfec5074b56b
Revises: c4f8a2e91d34
Create Date: 2026-04-16 20:33:34.780777

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "cfec5074b56b"
down_revision: str | None = "c4f8a2e91d34"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Reuse the `ownershipstatus` Postgres enum created by revision 1de5e6292627.
# `create_type=False` tells SQLAlchemy to reference the existing type rather than
# re-emit `CREATE TYPE`, which would fail as the type already exists.
_OWNERSHIP_STATUS = postgresql.ENUM(
    "free",
    "owned",
    "in_training",
    "collared",
    "blackmailed",
    "released",
    name="ownershipstatus",
    create_type=False,
)


def upgrade() -> None:
    op.create_table(
        "status_event",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("from_status", _OWNERSHIP_STATUS, nullable=False),
        sa.Column("to_status", _OWNERSHIP_STATUS, nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_status_event_goddess_id"), "status_event", ["goddess_id"], unique=False
    )
    op.create_index(op.f("ix_status_event_sub_id"), "status_event", ["sub_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_status_event_sub_id"), table_name="status_event")
    op.drop_index(op.f("ix_status_event_goddess_id"), table_name="status_event")
    op.drop_table("status_event")
