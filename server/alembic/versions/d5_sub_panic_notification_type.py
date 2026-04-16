"""d5 add sub_panic to notificationtype enum

Revision ID: d5a1b2c3e4f5
Revises: 6d68f7147e81
Create Date: 2026-04-16 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "d5a1b2c3e4f5"
down_revision: str | None = "6d68f7147e81"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'sub_panic'")


def downgrade() -> None:
    # Postgres does not support DROP VALUE on enums without recreating the type.
    # Downgrade is intentionally a no-op; the new value simply becomes unused.
    pass
