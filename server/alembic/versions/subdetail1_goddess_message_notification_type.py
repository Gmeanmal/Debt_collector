"""subdetail1 add goddess_message to notificationtype enum

Revision ID: subdetail1_goddess_message_notif
Revises: 07d331e36298
Create Date: 2026-04-18

"""

from collections.abc import Sequence

from alembic import op

revision: str = "subdetail1_goddess_message_notif"
down_revision: str | None = "07d331e36298"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'goddess_message'")


def downgrade() -> None:
    # Postgres does not support DROP VALUE on enums without recreating the type.
    pass
