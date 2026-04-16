"""add wishlist_fulfilled notification type

Revision ID: 1f0e764c64a3
Revises: 9f2b35dbd9ee
Create Date: 2026-04-16 20:22:12.162367

"""

from collections.abc import Sequence

from alembic import op

revision: str = "1f0e764c64a3"
down_revision: str | None = "9f2b35dbd9ee"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'wishlist_fulfilled'")


def downgrade() -> None:
    # Postgres does not support DROP VALUE on enums without recreating the type.
    # Downgrade is intentionally a no-op; the new value simply becomes unused.
    pass
