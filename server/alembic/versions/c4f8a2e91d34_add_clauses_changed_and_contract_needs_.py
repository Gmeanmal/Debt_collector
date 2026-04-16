"""add clauses_changed event + contract_needs_resignature notification

Revision ID: c4f8a2e91d34
Revises: 1f0e764c64a3
Create Date: 2026-04-16 22:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "c4f8a2e91d34"
down_revision: str | None = "1f0e764c64a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE debtcontracteventtype ADD VALUE IF NOT EXISTS 'clauses_changed'")
        op.execute(
            "ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'contract_needs_resignature'"
        )


def downgrade() -> None:
    # Postgres does not support DROP VALUE on enums without recreating the type.
    # Downgrade is intentionally a no-op; the new values simply become unused.
    pass
