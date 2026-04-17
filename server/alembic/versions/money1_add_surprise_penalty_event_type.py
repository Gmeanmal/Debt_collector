"""add surprise_penalty to debt_contract_event_type enum

Revision ID: money1_add_surprise_penalty_event_type
Revises: 148fb461728b
Create Date: 2026-04-17

"""

from collections.abc import Sequence

from alembic import op

revision: str = "money1_surprise_penalty_enum"
down_revision: str | None = "148fb461728b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE debtcontracteventtype ADD VALUE IF NOT EXISTS 'surprise_penalty'")


def downgrade() -> None:
    # Postgres does not support DROP VALUE on enums without recreating the type.
    # Downgrade is intentionally a no-op; the new value simply becomes unused.
    pass
