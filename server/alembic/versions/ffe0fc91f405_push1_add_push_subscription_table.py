"""push1 add push subscription table

Revision ID: ffe0fc91f405
Revises: notif1_actor_user_id
Create Date: 2026-04-19 02:51:41.919765

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel  # noqa: F401

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "ffe0fc91f405"
down_revision: str | None = "notif1_actor_user_id"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "push_subscription",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("auth", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("endpoint", name="uq_push_subscription_endpoint"),
    )
    op.create_index(
        op.f("ix_push_subscription_created_at"),
        "push_subscription",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_push_subscription_user_id"),
        "push_subscription",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_push_subscription_user_id"), table_name="push_subscription")
    op.drop_index(op.f("ix_push_subscription_created_at"), table_name="push_subscription")
    op.drop_constraint("uq_push_subscription_endpoint", "push_subscription", type_="unique")
    op.drop_table("push_subscription")
