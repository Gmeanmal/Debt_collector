"""h3_review_reminder_notification_type

Revision ID: 54e414ed39e5
Revises: d5a1b2c3e4f5
Create Date: 2026-04-16 20:46:22.936008

"""

from collections.abc import Sequence

from alembic import op

revision: str = "54e414ed39e5"
down_revision: str | None = "d5a1b2c3e4f5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'review_reminder'")


def downgrade() -> None:
    # Postgres does not support DROP VALUE on enums without recreating the type.
    # Downgrade is intentionally a no-op; the new value simply becomes unused.
    pass
