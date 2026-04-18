"""penalty1_defaults_columns

Revision ID: 259030fa7f44
Revises: eb4db276ecf4
Create Date: 2026-04-18 21:27:02.136783

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op  # noqa: F401 — alembic context import

revision: str = "259030fa7f44"
down_revision: str | None = "eb4db276ecf4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("penalty_rule", sa.Column("name", sa.Text(), nullable=True))
    op.add_column(
        "penalty_rule",
        sa.Column("fee_percent", sa.Numeric(5, 2), nullable=True),
    )
    op.create_check_constraint(
        "ck_penalty_rule_fee_percent_range",
        "penalty_rule",
        "fee_percent >= 0 AND fee_percent <= 100",
    )
    op.add_column(
        "penalty_rule",
        sa.Column("min_days_late", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_constraint("ck_penalty_rule_fee_percent_range", "penalty_rule", type_="check")
    op.drop_column("penalty_rule", "min_days_late")
    op.drop_column("penalty_rule", "fee_percent")
    op.drop_column("penalty_rule", "name")
