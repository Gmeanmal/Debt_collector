"""aftercare_1 intensity and goddess_read_at

Revision ID: 07d331e36298
Revises: 74c88e3644c0
Create Date: 2026-04-18 20:47:51.389824

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "07d331e36298"
down_revision: str | None = "74c88e3644c0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _table_exists(conn: sa.engine.Connection, table_name: str) -> bool:
    result = conn.execute(
        sa.text(
            "SELECT EXISTS ("
            "  SELECT 1 FROM information_schema.tables"
            "  WHERE table_schema = 'public' AND table_name = :t"
            ")"
        ),
        {"t": table_name},
    )
    return bool(result.scalar())


def upgrade() -> None:
    bind = op.get_bind()

    if _table_exists(bind, "sub_aftercare"):
        # Table already exists from the earlier p1_4_f6 migration — only add the new columns.
        op.add_column(
            "sub_aftercare",
            sa.Column("intensity", sa.Integer(), nullable=False, server_default="3"),
        )
        op.add_column(
            "sub_aftercare",
            sa.Column("read_by_goddess_at", sa.DateTime(), nullable=True),
        )
    else:
        # Table was never created (p1_4_f6 migration was skipped) — create it complete.
        op.create_table(
            "sub_aftercare",
            sa.Column("sub_id", sa.Uuid(), nullable=False),
            sa.Column("needs", sa.Text(), nullable=True),
            sa.Column("comfort_items", sa.Text(), nullable=True),
            sa.Column("contact_phrase", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("intensity", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("read_by_goddess_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("sub_id"),
        )

    op.create_check_constraint(
        "ck_aftercare_intensity",
        "sub_aftercare",
        "intensity BETWEEN 1 AND 5",
    )


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_constraint("ck_aftercare_intensity", "sub_aftercare", type_="check")

    if _table_exists(bind, "sub_aftercare"):
        result = bind.execute(
            sa.text(
                "SELECT column_name FROM information_schema.columns"
                " WHERE table_name = 'sub_aftercare' AND column_name IN ('needs', 'comfort_items')"
                " LIMIT 1"
            )
        )
        table_had_original_cols = result.fetchone() is not None

        if table_had_original_cols:
            # Table pre-existed — only drop the added columns.
            op.drop_column("sub_aftercare", "read_by_goddess_at")
            op.drop_column("sub_aftercare", "intensity")
        else:
            op.drop_table("sub_aftercare")
