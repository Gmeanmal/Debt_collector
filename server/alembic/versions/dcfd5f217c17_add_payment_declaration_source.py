"""add_payment_declaration_source

Revision ID: dcfd5f217c17
Revises: 764ad0db264f
Create Date: 2026-04-14 17:26:48.516665

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "dcfd5f217c17"
down_revision: str | None = "764ad0db264f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    declaration_source = sa.Enum(
        "sub_declared", "goddess_requested", "goddess_recorded", name="declarationsource"
    )
    declaration_source.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "payment_declaration",
        sa.Column("source", declaration_source, nullable=False, server_default="sub_declared"),
    )
    op.alter_column("payment_declaration", "source", server_default=None)
    op.create_index(
        "ix_payment_declaration_source", "payment_declaration", ["source"], unique=False
    )


def downgrade() -> None:
    op.drop_index(
        "ix_payment_declaration_source",
        table_name="payment_declaration",
        if_exists=True,
    )
    op.drop_column("payment_declaration", "source")
    sa.Enum(name="declarationsource").drop(op.get_bind(), checkfirst=True)
