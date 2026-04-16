"""p1_4_f6_sub_aftercare

Revision ID: b25a7ef727dd
Revises: 7aa2f3dc61ea
Create Date: 2026-04-16 23:25:11.613025

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b25a7ef727dd"
down_revision: str | None = "7aa2f3dc61ea"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sub_aftercare",
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("needs", sa.Text(), nullable=True),
        sa.Column("comfort_items", sa.Text(), nullable=True),
        sa.Column("contact_phrase", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("sub_id"),
    )


def downgrade() -> None:
    op.drop_table("sub_aftercare")
