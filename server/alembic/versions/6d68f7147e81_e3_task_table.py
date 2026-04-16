"""e3 task table

Revision ID: 6d68f7147e81
Revises: cfec5074b56b
Create Date: 2026-04-16 20:45:13.411879

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6d68f7147e81"
down_revision: str | None = "cfec5074b56b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "task",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_at", sa.DateTime(), nullable=True),
        sa.Column("points_on_complete", sa.Integer(), nullable=False),
        sa.Column("points_on_miss", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("open", "submitted", "approved", "rejected", "cancelled", name="taskstatus"),
            nullable=False,
        ),
        sa.Column("evidence_r2_key", sa.Text(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["reviewed_by"], ["user.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_goddess_id"), "task", ["goddess_id"], unique=False)
    op.create_index(op.f("ix_task_status"), "task", ["status"], unique=False)
    op.create_index(op.f("ix_task_sub_id"), "task", ["sub_id"], unique=False)
    op.add_column("ritual_occurrence", sa.Column("note", sa.Text(), nullable=True))
    op.add_column("ritual_occurrence", sa.Column("evidence_r2_key", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("ritual_occurrence", "evidence_r2_key")
    op.drop_column("ritual_occurrence", "note")
    op.drop_index(op.f("ix_task_sub_id"), table_name="task")
    op.drop_index(op.f("ix_task_status"), table_name="task")
    op.drop_index(op.f("ix_task_goddess_id"), table_name="task")
    op.drop_table("task")
    op.execute("DROP TYPE IF EXISTS taskstatus")
