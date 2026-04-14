"""add_user_bio_column

Revision ID: 764ad0db264f
Revises: a4f94bd32136
Create Date: 2026-04-14 17:26:41.121072

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "764ad0db264f"
down_revision: str | None = "a4f94bd32136"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("user", sa.Column("bio", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "bio")
