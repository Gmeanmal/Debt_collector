"""add kind to contract_adjustment

Revision ID: 148fb461728b
Revises: a1b2c3d4e5f6
Create Date: 2026-04-17 14:37:22.207842

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "148fb461728b"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("contract_adjustment", sa.Column("kind", sa.Text(), nullable=True))
    op.create_index(
        op.f("ix_contract_adjustment_kind"),
        "contract_adjustment",
        ["kind"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_contract_adjustment_kind"), table_name="contract_adjustment")
    op.drop_column("contract_adjustment", "kind")
