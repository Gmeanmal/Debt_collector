"""b4_sub_photo

Creates the ``sub_photo`` table with status enum and FK constraints to
``user`` (sub) and ``goddess``. Photos start in ``pending`` status and
await goddess review (B5).

Revision ID: b250c3fd8787
Revises: 328e11d71888
Create Date: 2026-04-16

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

revision: str = "b250c3fd8787"
down_revision: str | None = "328e11d71888"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sub_photo",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("r2_key", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("mime_type", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", name="subphotostatus"),
            nullable=False,
        ),
        sa.Column("rejection_reason", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("reviewed_by", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sub_photo_goddess_id"), "sub_photo", ["goddess_id"], unique=False)
    op.create_index(op.f("ix_sub_photo_status"), "sub_photo", ["status"], unique=False)
    op.create_index(op.f("ix_sub_photo_sub_id"), "sub_photo", ["sub_id"], unique=False)
    op.create_index(op.f("ix_sub_photo_uploaded_at"), "sub_photo", ["uploaded_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sub_photo_uploaded_at"), table_name="sub_photo")
    op.drop_index(op.f("ix_sub_photo_sub_id"), table_name="sub_photo")
    op.drop_index(op.f("ix_sub_photo_status"), table_name="sub_photo")
    op.drop_index(op.f("ix_sub_photo_goddess_id"), table_name="sub_photo")
    op.drop_table("sub_photo")
    op.execute("DROP TYPE IF EXISTS subphotostatus")
