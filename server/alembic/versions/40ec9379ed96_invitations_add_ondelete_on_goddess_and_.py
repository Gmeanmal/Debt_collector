"""invitations: add ondelete on goddess and used-by-user fks

Revision ID: 40ec9379ed96
Revises: 2cb2c9d15b49
Create Date: 2026-04-13 22:54:58.287532

"""

from collections.abc import Sequence

from alembic import op

revision: str = "40ec9379ed96"
down_revision: str | None = "2cb2c9d15b49"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("invitation_goddess_id_fkey", "invitation", type_="foreignkey")
    op.create_foreign_key(
        "invitation_goddess_id_fkey",
        "invitation",
        "goddess",
        ["goddess_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_constraint("invitation_used_by_user_id_fkey", "invitation", type_="foreignkey")
    op.create_foreign_key(
        "invitation_used_by_user_id_fkey",
        "invitation",
        "user",
        ["used_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("invitation_used_by_user_id_fkey", "invitation", type_="foreignkey")
    op.create_foreign_key(
        "invitation_used_by_user_id_fkey",
        "invitation",
        "user",
        ["used_by_user_id"],
        ["id"],
    )

    op.drop_constraint("invitation_goddess_id_fkey", "invitation", type_="foreignkey")
    op.create_foreign_key(
        "invitation_goddess_id_fkey",
        "invitation",
        "goddess",
        ["goddess_id"],
        ["id"],
    )
