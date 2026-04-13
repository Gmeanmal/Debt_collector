"""auth: users, goddess profile, refresh tokens, password reset tokens

Revision ID: d53ae7bfca8c
Revises:
Create Date: 2026-04-13 22:03:26.046892

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d53ae7bfca8c"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "goddess",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("display_name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("password_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_goddess_email"), "goddess", ["email"], unique=True)
    op.create_table(
        "user",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("goddess_id", sa.Uuid(), nullable=True),
        sa.Column("username", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("password_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column(
            "role",
            sa.Enum("admin", "goddess", "sub", name="userrole"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "pending_entry_tribute",
                "active",
                "blacklisted",
                "deleted",
                name="userstatus",
            ),
            nullable=False,
            server_default="active",
        ),
        sa.Column("first_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("last_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("twitter_handle", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("source_note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column(
            "theme_preference",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default="system",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["goddess_id"],
            ["goddess.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_email"), "user", ["email"], unique=True)
    op.create_index(op.f("ix_user_goddess_id"), "user", ["goddess_id"], unique=False)
    op.create_index(op.f("ix_user_role"), "user", ["role"], unique=False)
    op.create_index(op.f("ix_user_status"), "user", ["status"], unique=False)
    op.create_index(op.f("ix_user_username"), "user", ["username"], unique=True)
    op.create_table(
        "password_reset_token",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_password_reset_token_token_hash"),
        "password_reset_token",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_password_reset_token_user_id"),
        "password_reset_token",
        ["user_id"],
        unique=False,
    )
    op.create_table(
        "refresh_token",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_refresh_token_token_hash"),
        "refresh_token",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_refresh_token_user_id"),
        "refresh_token",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_refresh_token_user_id"), table_name="refresh_token")
    op.drop_index(op.f("ix_refresh_token_token_hash"), table_name="refresh_token")
    op.drop_table("refresh_token")
    op.drop_index(op.f("ix_password_reset_token_user_id"), table_name="password_reset_token")
    op.drop_index(op.f("ix_password_reset_token_token_hash"), table_name="password_reset_token")
    op.drop_table("password_reset_token")
    op.drop_index(op.f("ix_user_username"), table_name="user")
    op.drop_index(op.f("ix_user_status"), table_name="user")
    op.drop_index(op.f("ix_user_role"), table_name="user")
    op.drop_index(op.f("ix_user_goddess_id"), table_name="user")
    op.drop_index(op.f("ix_user_email"), table_name="user")
    op.drop_table("user")
    op.drop_index(op.f("ix_goddess_email"), table_name="goddess")
    op.drop_table("goddess")
