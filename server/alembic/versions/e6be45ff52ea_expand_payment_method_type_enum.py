"""expand payment method type enum

Revision ID: e6be45ff52ea
Revises: e550f25d4d68
Create Date: 2026-04-15 00:15:09.909843

"""

from collections.abc import Sequence

from alembic import op

revision: str = "e6be45ff52ea"
down_revision: str | None = "e550f25d4d68"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


NEW_VALUES = (
    "cashapp",
    "venmo",
    "revolut",
    "amazon",
    "wishtender",
    "tipfunder",
    "onlyfans",
    "loyalfans",
    "premium_chat",
    "sentbio",
    "sumeria",
    "btc",
    "eth",
)


def upgrade() -> None:
    for value in NEW_VALUES:
        op.execute(f"ALTER TYPE paymentmethodtype ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # Postgres does not support DROP VALUE on enums without recreating the type.
    # Downgrade is intentionally a no-op; the new values simply become unused.
    pass
