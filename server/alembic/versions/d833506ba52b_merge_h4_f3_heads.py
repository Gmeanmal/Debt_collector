"""merge_h4_f3_heads

Revision ID: d833506ba52b
Revises: 5d8b09d4be39, h4_contract_renewed_enums
Create Date: 2026-04-16 20:56:54.250869

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "d833506ba52b"
down_revision: str | None = ("5d8b09d4be39", "h4_contract_renewed_enums")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
