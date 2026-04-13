"""fix: restore ondelete on user, refresh_token, password_reset_token fks

Revision ID: 9957e29c0ac0
Revises: 9a073938a556
Create Date: 2026-04-13 23:39:03.768044

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9957e29c0ac0"
down_revision: str | None = "9a073938a556"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
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

    op.drop_constraint("refresh_token_user_id_fkey", "refresh_token", type_="foreignkey")
    op.create_foreign_key(
        "refresh_token_user_id_fkey",
        "refresh_token",
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

    op.drop_constraint("refresh_token_user_id_fkey", "refresh_token", type_="foreignkey")
    op.create_foreign_key(
        "refresh_token_user_id_fkey",
        "refresh_token",
        "user",
        ["user_id"],
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
