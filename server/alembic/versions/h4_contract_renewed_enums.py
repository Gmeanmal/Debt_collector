"""h4_contract_renewed_enums

Adds ``contract_renewed`` to both ``DebtContractEventType`` and
``NotificationType`` Postgres enums.

Revision ID: h4_contract_renewed_enums
Revises: ebdad219f6a6
Create Date: 2026-04-16

"""

from collections.abc import Sequence

from alembic import op

revision: str = "h4_contract_renewed_enums"
down_revision: str | None = "5d8b09d4be39"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE debtcontracteventtype ADD VALUE IF NOT EXISTS 'contract_renewed'")
        op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'contract_renewed'")


def downgrade() -> None:
    # Postgres does not support DROP VALUE on enums without recreating the type.
    # Downgrade is intentionally a no-op; the new values simply become unused.
    pass
