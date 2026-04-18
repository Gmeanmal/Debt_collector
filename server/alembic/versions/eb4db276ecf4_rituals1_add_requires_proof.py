"""rituals1_add_requires_proof

Revision ID: eb4db276ecf4
Revises: subdetail1_goddess_message_notif
Create Date: 2026-04-18

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "eb4db276ecf4"
down_revision: str | None = "subdetail1_goddess_message_notif"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "ritual",
        sa.Column(
            "requires_proof",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("ritual", "requires_proof")
