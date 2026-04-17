"""add payment_declaration.proof_key

Revision ID: 59f9d4ae8d17
Revises: money1_surprise_penalty_enum
Create Date: 2026-04-17 21:22:41.375304

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "59f9d4ae8d17"
down_revision: str | None = "money1_surprise_penalty_enum"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "payment_declaration",
        sa.Column("proof_key", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("payment_declaration", "proof_key")
