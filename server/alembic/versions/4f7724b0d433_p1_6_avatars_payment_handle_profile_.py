"""p1_6_avatars_payment_handle_profile_change_requests

Revision ID: 4f7724b0d433
Revises: e6be45ff52ea
Create Date: 2026-04-15 09:24:32.537119

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4f7724b0d433"
down_revision: str | None = "e6be45ff52ea"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_avatarkey_enum = sa.Enum(
    "default",
    "pink_1",
    "pink_2",
    "pink_3",
    "pink_4",
    "dark_1",
    "dark_2",
    "dark_3",
    "accent_1",
    "accent_2",
    name="avatarkey",
)

_pcr_status_enum = sa.Enum(
    "pending",
    "approved",
    "rejected",
    "awaiting_fee_payment",
    "cancelled",
    name="profilechangerequeststatus",
)


def upgrade() -> None:
    # --- profile_change_request table ---
    op.create_table(
        "profile_change_request",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sub_id", sa.Uuid(), nullable=False),
        sa.Column("requested_at", sa.DateTime(), nullable=False),
        sa.Column("status", _pcr_status_enum, nullable=False),
        sa.Column("proposed_first_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("proposed_last_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("proposed_display_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("proposed_notes", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("proposed_avatar_key", _avatarkey_enum, nullable=True),
        sa.Column("fee_amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("fee_payment_id", sa.Uuid(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("resolution_note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(
            ["fee_payment_id"], ["payment_declaration.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["sub_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_profile_change_request_status"),
        "profile_change_request",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_profile_change_request_sub_id"),
        "profile_change_request",
        ["sub_id"],
        unique=False,
    )

    # --- Keep existing FK noise from autogenerate (debt_contract current_version) ---
    op.create_foreign_key(
        "fk_debt_contract_current_version",
        "debt_contract",
        "debt_contract_version",
        ["current_version_id"],
        ["id"],
        ondelete="SET NULL",
        use_alter=True,
    )

    # Refresh FK on password_reset_token (autogenerate detected drift)
    op.drop_constraint(
        op.f("password_reset_token_user_id_fkey"),
        "password_reset_token",
        type_="foreignkey",
    )
    op.create_foreign_key(None, "password_reset_token", "user", ["user_id"], ["id"])
    op.drop_constraint(op.f("refresh_token_user_id_fkey"), "refresh_token", type_="foreignkey")
    op.create_foreign_key(None, "refresh_token", "user", ["user_id"], ["id"])

    # --- user table: add avatar_key (nullable first, backfill, then NOT NULL) ---
    _avatarkey_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "user",
        sa.Column(
            "avatar_key",
            _avatarkey_enum,
            nullable=True,
        ),
    )
    op.execute("UPDATE \"user\" SET avatar_key = 'default' WHERE avatar_key IS NULL")
    op.alter_column("user", "avatar_key", nullable=False)

    # --- user table: payment_handle ---
    op.add_column(
        "user",
        sa.Column(
            "payment_handle",
            sqlmodel.sql.sqltypes.AutoString(length=64),
            nullable=True,
        ),
    )

    # --- Refresh user.goddess_id FK (autogenerate drift) ---
    op.drop_constraint(op.f("user_goddess_id_fkey"), "user", type_="foreignkey")
    op.create_foreign_key(None, "user", "goddess", ["goddess_id"], ["id"])

    # --- Drop avatar_url ---
    op.drop_column("user", "avatar_url")

    # PaymentCategory is stored as VARCHAR (SQLModel StrEnum) — no PG enum ALTER needed
    # for the new profile_change_fee value.


def downgrade() -> None:
    op.add_column(
        "user",
        sa.Column("avatar_url", sa.VARCHAR(), autoincrement=False, nullable=True),
    )
    op.drop_constraint(None, "user", type_="foreignkey")
    op.create_foreign_key(
        op.f("user_goddess_id_fkey"),
        "user",
        "goddess",
        ["goddess_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.drop_column("user", "payment_handle")
    op.drop_column("user", "avatar_key")
    op.drop_constraint(None, "refresh_token", type_="foreignkey")
    op.create_foreign_key(
        op.f("refresh_token_user_id_fkey"),
        "refresh_token",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_constraint(None, "password_reset_token", type_="foreignkey")
    op.create_foreign_key(
        op.f("password_reset_token_user_id_fkey"),
        "password_reset_token",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_constraint("fk_debt_contract_current_version", "debt_contract", type_="foreignkey")
    op.drop_index(op.f("ix_profile_change_request_sub_id"), table_name="profile_change_request")
    op.drop_index(op.f("ix_profile_change_request_status"), table_name="profile_change_request")
    op.drop_table("profile_change_request")
    _pcr_status_enum.drop(op.get_bind(), checkfirst=True)
    _avatarkey_enum.drop(op.get_bind(), checkfirst=True)
