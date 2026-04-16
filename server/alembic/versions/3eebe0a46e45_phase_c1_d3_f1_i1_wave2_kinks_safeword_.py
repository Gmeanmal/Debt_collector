"""phase c1 d3 f1 i1 wave2 kinks safeword journal wishlist

Revision ID: 3eebe0a46e45
Revises: 1de5e6292627
Create Date: 2026-04-16 20:00:13.094063

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3eebe0a46e45"
down_revision: str | None = "1de5e6292627"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "kink_category",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
        sa.Column("label", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("safety_flag", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "journal_entry",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "mood",
            sa.Enum(
                "great",
                "good",
                "neutral",
                "low",
                "bad",
                "numb",
                "overwhelmed",
                name="journalmood",
            ),
            nullable=False,
        ),
        sa.Column("photo_r2_key", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("read_by_goddess_at", sa.DateTime(), nullable=True),
        sa.Column("goddess_comment", sa.Text(), nullable=True),
        sa.Column("goddess_comment_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_journal_entry_goddess_id"), "journal_entry", ["goddess_id"], unique=False
    )
    op.create_index(op.f("ix_journal_entry_sub_id"), "journal_entry", ["sub_id"], unique=False)
    op.create_table(
        "kink_item",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=True),
        sa.Column("slug", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
        sa.Column("label", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("safety_flag", sa.Boolean(), nullable=False),
        sa.Column("is_custom", sa.Boolean(), nullable=False),
        sa.Column("proposed_by", sa.Uuid(), nullable=True),
        sa.Column("approved", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["kink_category.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["proposed_by"], ["user.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_kink_item_category_id"), "kink_item", ["category_id"], unique=False)
    op.create_index(op.f("ix_kink_item_goddess_id"), "kink_item", ["goddess_id"], unique=False)
    op.create_index("uq_kink_item_slug_goddess", "kink_item", ["slug", "goddess_id"], unique=True)
    op.create_table(
        "sub_safeword",
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("word", sa.Text(), nullable=False),
        sa.Column("signal", sa.Text(), nullable=True),
        sa.Column("emergency_contact_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("emergency_contact_phone", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("sub_id"),
    )
    op.create_index(
        op.f("ix_sub_safeword_goddess_id"), "sub_safeword", ["goddess_id"], unique=False
    )
    op.create_table(
        "wishlist_item",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("sub_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("external_url", sa.Text(), nullable=True),
        sa.Column("target_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "status",
            sa.Enum("cancelled", "fulfilled", "open", name="wishliststatus"),
            nullable=False,
        ),
        sa.Column(
            "created_by",
            sa.Enum("goddess", "sub", name="wishlistcreatedby"),
            nullable=False,
        ),
        sa.Column("approved", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("fulfilled_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_wishlist_item_goddess_id"), "wishlist_item", ["goddess_id"], unique=False
    )
    op.create_index(op.f("ix_wishlist_item_sub_id"), "wishlist_item", ["sub_id"], unique=False)
    op.create_table(
        "sub_kink_rating",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=False),
        sa.Column("item_id", sa.Uuid(), nullable=False),
        sa.Column(
            "rating",
            sa.Enum(
                "hard_limit",
                "soft_limit",
                "curious",
                "loves",
                "fetish_need",
                "not_set",
                name="kinkrating",
            ),
            nullable=False,
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["goddess_id"], ["goddess.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["item_id"], ["kink_item.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sub_id", "item_id", name="uq_sub_kink_rating_sub_item"),
    )
    op.create_index(
        op.f("ix_sub_kink_rating_goddess_id"), "sub_kink_rating", ["goddess_id"], unique=False
    )
    op.create_index(
        op.f("ix_sub_kink_rating_item_id"), "sub_kink_rating", ["item_id"], unique=False
    )
    op.create_index(op.f("ix_sub_kink_rating_sub_id"), "sub_kink_rating", ["sub_id"], unique=False)

    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE paymentcategory ADD VALUE IF NOT EXISTS 'profile_change_fee'")
        op.execute("ALTER TYPE paymentcategory ADD VALUE IF NOT EXISTS 'wishlist'")
        op.execute("ALTER TYPE allocationtargettype ADD VALUE IF NOT EXISTS 'wishlist_goal'")


def downgrade() -> None:
    op.drop_index(op.f("ix_sub_kink_rating_sub_id"), table_name="sub_kink_rating")
    op.drop_index(op.f("ix_sub_kink_rating_item_id"), table_name="sub_kink_rating")
    op.drop_index(op.f("ix_sub_kink_rating_goddess_id"), table_name="sub_kink_rating")
    op.drop_table("sub_kink_rating")
    op.drop_index(op.f("ix_wishlist_item_sub_id"), table_name="wishlist_item")
    op.drop_index(op.f("ix_wishlist_item_goddess_id"), table_name="wishlist_item")
    op.drop_table("wishlist_item")
    op.drop_index(op.f("ix_sub_safeword_goddess_id"), table_name="sub_safeword")
    op.drop_table("sub_safeword")
    op.drop_index("uq_kink_item_slug_goddess", table_name="kink_item")
    op.drop_index(op.f("ix_kink_item_goddess_id"), table_name="kink_item")
    op.drop_index(op.f("ix_kink_item_category_id"), table_name="kink_item")
    op.drop_table("kink_item")
    op.drop_index(op.f("ix_journal_entry_sub_id"), table_name="journal_entry")
    op.drop_index(op.f("ix_journal_entry_goddess_id"), table_name="journal_entry")
    op.drop_table("journal_entry")
    op.drop_table("kink_category")

    for enum_name in ("kinkrating", "wishlistcreatedby", "wishliststatus", "journalmood"):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
