"""i5_penalty_rules

Creates ``penalty_rule`` + ``penalty_event`` tables plus their enum types
(``penaltytrigger``, ``penaltyaction``) and extends ``meritsourcekind`` with
two values (``contract_miss``, ``rolling_late``) that the penalty engine can
emit into the merit ledger.

Revision ID: i5_penalty_rules
Revises: e9578df69b75
Create Date: 2026-04-16

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "i5_penalty_rules"
down_revision: str | None = "e9578df69b75"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_PENALTY_TRIGGER = postgresql.ENUM(
    "contract_missed",
    "ritual_missed",
    "rolling_late",
    "task_missed",
    name="penaltytrigger",
    create_type=False,
)

_PENALTY_ACTION = postgresql.ENUM(
    "notify_only",
    "apply_points",
    "apply_fee",
    name="penaltyaction",
    create_type=False,
)


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'penaltytrigger') THEN "
        "    CREATE TYPE penaltytrigger AS ENUM "
        "      ('contract_missed', 'ritual_missed', 'rolling_late', 'task_missed'); "
        "  END IF; "
        "END $$"
    )
    op.execute(
        "DO $$ BEGIN "
        "  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'penaltyaction') THEN "
        "    CREATE TYPE penaltyaction AS ENUM "
        "      ('notify_only', 'apply_points', 'apply_fee'); "
        "  END IF; "
        "END $$"
    )

    op.create_table(
        "penalty_rule",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("sub_id", sa.Uuid(), nullable=True),
        sa.Column("trigger", _PENALTY_TRIGGER, nullable=False),
        sa.Column("action", _PENALTY_ACTION, nullable=False),
        sa.Column("points_delta", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fee_amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("cooldown_hours", sa.Integer(), nullable=False, server_default="24"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_penalty_rule_goddess_id"), "penalty_rule", ["goddess_id"], unique=False
    )
    op.create_index(op.f("ix_penalty_rule_sub_id"), "penalty_rule", ["sub_id"], unique=False)
    op.create_index(op.f("ix_penalty_rule_trigger"), "penalty_rule", ["trigger"], unique=False)

    op.create_table(
        "penalty_event",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("rule_id", sa.Uuid(), nullable=False),
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("trigger", _PENALTY_TRIGGER, nullable=False),
        sa.Column("action", _PENALTY_ACTION, nullable=False),
        sa.Column("points_delta", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("source_kind", sa.Text(), nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["rule_id"], ["penalty_rule.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_penalty_event_created_at"), "penalty_event", ["created_at"], unique=False
    )
    op.create_index(
        op.f("ix_penalty_event_goddess_id"), "penalty_event", ["goddess_id"], unique=False
    )
    op.create_index(op.f("ix_penalty_event_rule_id"), "penalty_event", ["rule_id"], unique=False)
    op.create_index(
        op.f("ix_penalty_event_source_id"), "penalty_event", ["source_id"], unique=False
    )
    op.create_index(
        op.f("ix_penalty_event_source_kind"), "penalty_event", ["source_kind"], unique=False
    )
    op.create_index(op.f("ix_penalty_event_sub_id"), "penalty_event", ["sub_id"], unique=False)

    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE meritsourcekind ADD VALUE IF NOT EXISTS 'contract_miss'")
        op.execute("ALTER TYPE meritsourcekind ADD VALUE IF NOT EXISTS 'rolling_late'")


def downgrade() -> None:
    op.drop_index(op.f("ix_penalty_event_sub_id"), table_name="penalty_event")
    op.drop_index(op.f("ix_penalty_event_source_kind"), table_name="penalty_event")
    op.drop_index(op.f("ix_penalty_event_source_id"), table_name="penalty_event")
    op.drop_index(op.f("ix_penalty_event_rule_id"), table_name="penalty_event")
    op.drop_index(op.f("ix_penalty_event_goddess_id"), table_name="penalty_event")
    op.drop_index(op.f("ix_penalty_event_created_at"), table_name="penalty_event")
    op.drop_table("penalty_event")

    op.drop_index(op.f("ix_penalty_rule_trigger"), table_name="penalty_rule")
    op.drop_index(op.f("ix_penalty_rule_sub_id"), table_name="penalty_rule")
    op.drop_index(op.f("ix_penalty_rule_goddess_id"), table_name="penalty_rule")
    op.drop_table("penalty_rule")

    op.execute("DROP TYPE IF EXISTS penaltyaction")
    op.execute("DROP TYPE IF EXISTS penaltytrigger")
    # Postgres does not support DROP VALUE on enums without recreating the type.
    # The meritsourcekind additions (contract_miss, rolling_late) are intentionally
    # left in place on downgrade; they simply become unused.
