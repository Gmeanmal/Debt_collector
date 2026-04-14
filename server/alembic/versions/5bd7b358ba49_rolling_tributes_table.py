"""rolling tributes table

Revision ID: 5bd7b358ba49
Revises: 9957e29c0ac0
Create Date: 2026-04-14 02:06:10.347497

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "5bd7b358ba49"
down_revision: str | None = "9957e29c0ac0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "rolling_tribute",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "deadline_day",
            sa.Enum("mon", "tue", "wed", "thu", "fri", "sat", "sun", name="deadlineday"),
            nullable=False,
        ),
        sa.Column("deadline_time", sa.Time(), nullable=False),
        sa.Column("late_multiplier_per_day", sa.Integer(), nullable=False),
        sa.Column("paused", sa.Boolean(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("last_paid_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sub_id", name="uq_rolling_tribute_sub_id"),
    )


def downgrade() -> None:
    op.drop_table("rolling_tribute")
    op.execute("DROP TYPE IF EXISTS deadlineday")
