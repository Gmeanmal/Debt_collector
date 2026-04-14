"""drop unused goddess_requested declaration source variant

Revision ID: 49af64ebc64b
Revises: dcfd5f217c17
Create Date: 2026-04-14 21:17:33.336207

"""

from collections.abc import Sequence

from alembic import op

revision: str = "49af64ebc64b"
down_revision: str | None = "dcfd5f217c17"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE declarationsource RENAME TO declarationsource_old")
    op.execute("CREATE TYPE declarationsource AS ENUM ('sub_declared', 'goddess_recorded')")
    op.execute(
        "ALTER TABLE payment_declaration "
        "ALTER COLUMN source TYPE declarationsource "
        "USING source::text::declarationsource"
    )
    op.execute("DROP TYPE declarationsource_old")


def downgrade() -> None:
    op.execute("ALTER TYPE declarationsource RENAME TO declarationsource_old")
    op.execute(
        "CREATE TYPE declarationsource AS ENUM "
        "('sub_declared', 'goddess_requested', 'goddess_recorded')"
    )
    op.execute(
        "ALTER TABLE payment_declaration "
        "ALTER COLUMN source TYPE declarationsource "
        "USING source::text::declarationsource"
    )
    op.execute("DROP TYPE declarationsource_old")
