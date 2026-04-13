"""auth: add avatar_url and last_login_at to user

Revision ID: user_avatar_last_login
Revises: cascade_fk_tokens
Create Date: 2026-04-13 22:12:37.714931

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

revision: str = "user_avatar_last_login"
down_revision: str | None = "cascade_fk_tokens"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user", sa.Column("avatar_url", sqlmodel.sql.sqltypes.AutoString(), nullable=True)
    )
    op.add_column("user", sa.Column("last_login_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "last_login_at")
    op.drop_column("user", "avatar_url")
