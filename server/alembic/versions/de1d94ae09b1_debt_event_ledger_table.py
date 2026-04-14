"""debt_event ledger table

Revision ID: de1d94ae09b1
Revises: 38f259f9ec7e
Create Date: 2026-04-14 02:54:23.709089

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "de1d94ae09b1"
down_revision: str | None = "38f259f9ec7e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "debt_event",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("contract_id", sa.Uuid(), nullable=False),
        sa.Column(
            "event_type",
            sa.Enum(
                "period_interest",
                "late_penalty",
                "payment_applied",
                "adjustment",
                "surprise_penalty",
                "buyout_paid",
                name="eventtype",
            ),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column("period_index", sa.Integer(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["contract_id"], ["debt_contract.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "contract_id", "period_index", "event_type", name="uq_debt_event_period_bound"
        ),
    )
    op.create_index(
        "ix_debt_event_contract_created",
        "debt_event",
        ["contract_id", "created_at"],
        unique=False,
    )
    op.create_index(op.f("ix_debt_event_contract_id"), "debt_event", ["contract_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_debt_event_contract_id"), table_name="debt_event")
    op.drop_index("ix_debt_event_contract_created", table_name="debt_event")
    op.drop_table("debt_event")
    op.execute("DROP TYPE IF EXISTS eventtype")
