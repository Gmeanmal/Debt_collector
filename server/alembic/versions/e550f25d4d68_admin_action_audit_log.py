"""admin_action audit log

Revision ID: e550f25d4d68
Revises: 50f62a490dd6
Create Date: 2026-04-14 22:24:14.644489

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "e550f25d4d68"
down_revision: str | None = "50f62a490dd6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "admin_action",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("admin_id", sa.Uuid(), nullable=False),
        sa.Column("acting_as_user_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("entity", sa.String(length=64), nullable=True),
        sa.Column("entity_id", sa.Uuid(), nullable=True),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["acting_as_user_id"], ["user.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["admin_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_admin_action_admin_id", "admin_action", ["admin_id"], unique=False)
    op.create_index("ix_admin_action_created_at", "admin_action", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_admin_action_created_at", table_name="admin_action")
    op.drop_index("ix_admin_action_admin_id", table_name="admin_action")
    op.drop_table("admin_action")
