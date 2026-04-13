"""auth: cascade delete token tables on user deletion

Revision ID: cascade_fk_tokens
Revises: d53ae7bfca8c
Create Date: 2026-04-13 22:10:39.852380

"""

from collections.abc import Sequence

from alembic import op

revision: str = "cascade_fk_tokens"
down_revision: str | None = "d53ae7bfca8c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("refresh_token_user_id_fkey", "refresh_token", type_="foreignkey")
    op.create_foreign_key(
        "refresh_token_user_id_fkey",
        "refresh_token",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint(
        "password_reset_token_user_id_fkey", "password_reset_token", type_="foreignkey"
    )
    op.create_foreign_key(
        "password_reset_token_user_id_fkey",
        "password_reset_token",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("user_goddess_id_fkey", "user", type_="foreignkey")
    op.create_foreign_key(
        "user_goddess_id_fkey",
        "user",
        "goddess",
        ["goddess_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint("user_goddess_id_fkey", "user", type_="foreignkey")
    op.create_foreign_key(
        "user_goddess_id_fkey",
        "user",
        "goddess",
        ["goddess_id"],
        ["id"],
    )

    op.drop_constraint(
        "password_reset_token_user_id_fkey", "password_reset_token", type_="foreignkey"
    )
    op.create_foreign_key(
        "password_reset_token_user_id_fkey",
        "password_reset_token",
        "user",
        ["user_id"],
        ["id"],
    )

    op.drop_constraint("refresh_token_user_id_fkey", "refresh_token", type_="foreignkey")
    op.create_foreign_key(
        "refresh_token_user_id_fkey",
        "refresh_token",
        "user",
        ["user_id"],
        ["id"],
    )
