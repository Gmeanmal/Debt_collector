"""journal_1_attachment_and_private_toggle

Revision ID: 74c88e3644c0
Revises: b06e2c961616
Create Date: 2026-04-18 20:39:20.653904

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "74c88e3644c0"
down_revision: str | None = "b06e2c961616"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "journal_entry",
        sa.Column("attachment_key", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        "journal_entry",
        sa.Column("attachment_mime", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        "journal_entry",
        sa.Column("is_private", sa.Boolean(), server_default="false", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("journal_entry", "is_private")
    op.drop_column("journal_entry", "attachment_mime")
    op.drop_column("journal_entry", "attachment_key")
