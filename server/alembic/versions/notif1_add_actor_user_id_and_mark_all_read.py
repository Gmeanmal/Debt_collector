"""notif1 add actor_user_id to notification and mark-all-read support

Revision ID: notif1_actor_user_id
Revises: subdetail1_goddess_message_notif
Create Date: 2026-04-18

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "notif1_actor_user_id"
down_revision: str | None = "4e3b560cf217"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "notification",
        sa.Column(
            "actor_user_id",
            sa.UUID(),
            sa.ForeignKey("user.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("notification", "actor_user_id")
