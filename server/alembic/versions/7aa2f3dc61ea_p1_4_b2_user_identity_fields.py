"""p1_4_b2_user_identity_fields

Revision ID: 7aa2f3dc61ea
Revises: b250c3fd8787
Create Date: 2026-04-16 23:23:31.108317

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

revision: str = "7aa2f3dc61ea"
down_revision: str | None = "b250c3fd8787"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user", sa.Column("gender", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=True)
    )
    op.add_column(
        "user", sa.Column("pronouns", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=True)
    )
    op.add_column(
        "user", sa.Column("location", sqlmodel.sql.sqltypes.AutoString(length=120), nullable=True)
    )
    op.add_column(
        "user", sa.Column("timezone", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=True)
    )
    op.add_column("user", sa.Column("date_of_birth", sa.Date(), nullable=True))
    op.add_column(
        "user", sa.Column("real_name", sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True)
    )
    op.add_column(
        "profile_change_request",
        sa.Column("proposed_real_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("profile_change_request", "proposed_real_name")
    op.drop_column("user", "real_name")
    op.drop_column("user", "date_of_birth")
    op.drop_column("user", "timezone")
    op.drop_column("user", "location")
    op.drop_column("user", "pronouns")
    op.drop_column("user", "gender")
