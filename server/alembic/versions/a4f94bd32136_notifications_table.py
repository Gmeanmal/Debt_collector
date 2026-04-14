"""notifications table

Revision ID: a4f94bd32136
Revises: 3b89f3a0ab55
Create Date: 2026-04-14 03:17:54.855333

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a4f94bd32136"
down_revision: str | None = "3b89f3a0ab55"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notification",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "invitation_claimed",
                "payment_pending",
                "payment_validated",
                "payment_rejected",
                "rolling_reminder",
                "rolling_late",
                "contract_proposed",
                "contract_countered",
                "contract_counter_accepted",
                "contract_counter_rejected",
                "contract_signed",
                "contract_period_interest",
                "contract_late_penalty",
                "contract_surprise_penalty",
                "contract_adjustment_proposed",
                "contract_adjustment_accepted",
                "contract_adjustment_refused",
                "contract_buyout_requested",
                "contract_buyout_paid",
                "contract_breached",
                "contract_forgiven",
                name="notificationtype",
            ),
            nullable=False,
        ),
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("link", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("read_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_notification_created_at"), "notification", ["created_at"], unique=False
    )
    op.create_index(
        "ix_notification_user_created_desc",
        "notification",
        ["user_id", "created_at"],
        unique=False,
    )
    op.create_index(op.f("ix_notification_user_id"), "notification", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notification_user_id"), table_name="notification")
    op.drop_index("ix_notification_user_created_desc", table_name="notification")
    op.drop_index(op.f("ix_notification_created_at"), table_name="notification")
    op.drop_table("notification")
    op.execute("DROP TYPE IF EXISTS notificationtype")
