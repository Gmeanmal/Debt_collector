"""blacklist and contract adjustment tables

Revision ID: 3b89f3a0ab55
Revises: de1d94ae09b1
Create Date: 2026-04-14 02:56:09.521621

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3b89f3a0ab55"
down_revision: str | None = "de1d94ae09b1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "blacklist_entry",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("reason", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("balance_snapshot", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("reinstatement_fee_paid", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("breached_at", sa.DateTime(), nullable=False),
        sa.Column("forgiven_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_blacklist_entry_goddess_id"),
        "blacklist_entry",
        ["goddess_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_blacklist_entry_sub_id"),
        "blacklist_entry",
        ["sub_id"],
        unique=False,
    )
    op.create_table(
        "contract_adjustment",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("contract_id", sa.Uuid(), nullable=False),
        sa.Column("proposed_by", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("reason", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "applied",
                "pending_sub_approval",
                "accepted",
                "refused",
                name="adjustmentstatus",
            ),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["contract_id"], ["debt_contract.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["proposed_by"], ["user.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_contract_adjustment_contract_id"),
        "contract_adjustment",
        ["contract_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_contract_adjustment_contract_id"), table_name="contract_adjustment")
    op.drop_table("contract_adjustment")
    op.drop_index(op.f("ix_blacklist_entry_sub_id"), table_name="blacklist_entry")
    op.drop_index(op.f("ix_blacklist_entry_goddess_id"), table_name="blacklist_entry")
    op.drop_table("blacklist_entry")
    op.execute("DROP TYPE IF EXISTS adjustmentstatus")
