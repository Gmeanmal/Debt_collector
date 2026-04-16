"""merge f4 i5 heads

Revision ID: bca1c200482d
Revises: f4_reward_punishment_tiers, i5_penalty_rules
Create Date: 2026-04-16 21:21:40.405364

"""

from collections.abc import Sequence

revision: str = "bca1c200482d"
down_revision: str | None = ("f4_reward_punishment_tiers", "i5_penalty_rules")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
