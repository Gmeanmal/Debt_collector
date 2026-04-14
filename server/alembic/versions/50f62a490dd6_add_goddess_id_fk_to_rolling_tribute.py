"""add goddess_id fk to rolling_tribute

Revision ID: 50f62a490dd6
Revises: 49af64ebc64b
Create Date: 2026-04-14 21:31:46.940070

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "50f62a490dd6"
down_revision: str | None = "49af64ebc64b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "rolling_tribute",
        sa.Column("goddess_id", sa.Uuid(), nullable=True),
    )
    op.execute(
        "UPDATE rolling_tribute rt "
        "SET goddess_id = u.goddess_id "
        'FROM "user" u '
        "WHERE u.id = rt.sub_id"
    )
    op.alter_column("rolling_tribute", "goddess_id", nullable=False)
    op.create_foreign_key(
        "fk_rolling_tribute_goddess_id_goddess",
        "rolling_tribute",
        "goddess",
        ["goddess_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        "ix_rolling_tribute_goddess_id",
        "rolling_tribute",
        ["goddess_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_rolling_tribute_goddess_id", table_name="rolling_tribute")
    op.drop_constraint(
        "fk_rolling_tribute_goddess_id_goddess",
        "rolling_tribute",
        type_="foreignkey",
    )
    op.drop_column("rolling_tribute", "goddess_id")
