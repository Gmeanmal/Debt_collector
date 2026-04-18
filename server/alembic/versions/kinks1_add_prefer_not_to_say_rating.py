"""kinks1 add prefer_not_to_say to kinkrating enum

Revision ID: kinks1_prefer_not_to_say_rating
Revises: 59f9d4ae8d17
Create Date: 2026-04-18

"""

from collections.abc import Sequence

from alembic import op

revision: str = "kinks1_prefer_not_to_say_rating"
down_revision: str | None = "59f9d4ae8d17"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE kinkrating ADD VALUE IF NOT EXISTS 'prefer_not_to_say'")


def downgrade() -> None:
    # Postgres does not support DROP VALUE on enums without recreating the type.
    # Downgrade is intentionally a no-op; the new value simply becomes unused.
    pass
