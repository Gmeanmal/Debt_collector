"""add journal_comment to notificationtype enum

Revision ID: 9f2b35dbd9ee
Revises: 3eebe0a46e45
Create Date: 2026-04-16 21:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "9f2b35dbd9ee"
down_revision: str | None = "3eebe0a46e45"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'journal_comment'")


def downgrade() -> None:
    # Postgres does not support DROP VALUE on enums without recreating the type.
    # Downgrade is intentionally a no-op; the new value simply becomes unused.
    pass
