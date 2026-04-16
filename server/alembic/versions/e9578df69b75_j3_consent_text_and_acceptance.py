"""j3_consent_text_and_acceptance

Revision ID: e9578df69b75
Revises: 52252f135ceb
Create Date: 2026-04-16 21:14:21.151438

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e9578df69b75"
down_revision: str | None = "52252f135ceb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "consent_text",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("body_md", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", "version", name="uq_consent_text_slug_version"),
    )
    op.create_index(op.f("ix_consent_text_slug"), "consent_text", ["slug"], unique=False)

    op.create_table(
        "consent_acceptance",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("consent_text_id", sa.Uuid(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(), nullable=False),
        sa.Column("ip_address", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["consent_text_id"], ["consent_text.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "consent_text_id",
            name="uq_consent_acceptance_user_consent",
        ),
    )
    op.create_index(
        op.f("ix_consent_acceptance_consent_text_id"),
        "consent_acceptance",
        ["consent_text_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_consent_acceptance_user_id"),
        "consent_acceptance",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_consent_acceptance_user_id"), table_name="consent_acceptance")
    op.drop_index(op.f("ix_consent_acceptance_consent_text_id"), table_name="consent_acceptance")
    op.drop_table("consent_acceptance")
    op.drop_index(op.f("ix_consent_text_slug"), table_name="consent_text")
    op.drop_table("consent_text")
