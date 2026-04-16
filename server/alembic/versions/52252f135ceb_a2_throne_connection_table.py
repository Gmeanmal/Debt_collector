"""a2_throne_connection_table

Revision ID: 52252f135ceb
Revises: 5a94b6fde0ed
Create Date: 2026-04-16 21:13:35.460185

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "52252f135ceb"
down_revision: str | None = "5a94b6fde0ed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "throne_connection",
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("account_id", sa.Text(), nullable=False),
        sa.Column("access_token_enc", sa.LargeBinary(), nullable=False),
        sa.Column("access_token_last4", sa.Text(), nullable=False),
        sa.Column("dek_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("goddess_id"),
    )


def downgrade() -> None:
    op.drop_table("throne_connection")
