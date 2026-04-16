"""f4_reward_punishment_tiers

Adds reward_tier, punishment_tier, reward_redemption tables and extends the
``meritsourcekind`` Postgres enum with ``reward_redeem`` and ``punishment_invoke``.

Revision ID: f4_reward_punishment_tiers
Revises: 5a94b6fde0ed
Create Date: 2026-04-16

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f4_reward_punishment_tiers"
down_revision: str | None = "5a94b6fde0ed"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE meritsourcekind ADD VALUE IF NOT EXISTS 'reward_redeem'")
        op.execute("ALTER TYPE meritsourcekind ADD VALUE IF NOT EXISTS 'punishment_invoke'")

    op.create_table(
        "reward_tier",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("cost", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("cost > 0", name="ck_reward_tier_cost_positive"),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reward_tier_goddess_id"), "reward_tier", ["goddess_id"], unique=False)

    op.create_table(
        "punishment_tier",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_points_penalty", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "default_points_penalty <= 0",
            name="ck_punishment_tier_penalty_non_positive",
        ),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_punishment_tier_goddess_id"),
        "punishment_tier",
        ["goddess_id"],
        unique=False,
    )

    op.create_table(
        "reward_redemption",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("reward_id", sa.Uuid(), nullable=False),
        sa.Column("cost_snapshot", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["reward_id"], ["reward_tier.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_reward_redemption_created_at"),
        "reward_redemption",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_reward_redemption_goddess_id"),
        "reward_redemption",
        ["goddess_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_reward_redemption_reward_id"),
        "reward_redemption",
        ["reward_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_reward_redemption_sub_id"),
        "reward_redemption",
        ["sub_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_reward_redemption_sub_id"), table_name="reward_redemption")
    op.drop_index(op.f("ix_reward_redemption_reward_id"), table_name="reward_redemption")
    op.drop_index(op.f("ix_reward_redemption_goddess_id"), table_name="reward_redemption")
    op.drop_index(op.f("ix_reward_redemption_created_at"), table_name="reward_redemption")
    op.drop_table("reward_redemption")

    op.drop_index(op.f("ix_punishment_tier_goddess_id"), table_name="punishment_tier")
    op.drop_table("punishment_tier")

    op.drop_index(op.f("ix_reward_tier_goddess_id"), table_name="reward_tier")
    op.drop_table("reward_tier")

    # Postgres does not support DROP VALUE on enums without recreating the type.
    # Downgrade leaves the two new values in place — they simply become unused.
