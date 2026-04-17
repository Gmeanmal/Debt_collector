"""add slug to debt_contract

Revision ID: a1b2c3d4e5f6
Revises: b25a7ef727dd
Create Date: 2026-04-17 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "b25a7ef727dd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    from models.debt import generate_contract_slug

    conn = op.get_bind()

    # Step 1: add the column as nullable so existing rows are not immediately rejected.
    op.add_column("debt_contract", sa.Column("slug", sa.Text(), nullable=True))

    # Step 2: backfill every existing row with a unique slug.
    # We iterate row by row to guarantee uniqueness within the migration itself.
    # A collision retry loop guards against the tiny probability of a duplicate draw.
    existing_ids = conn.execute(sa.text("SELECT id FROM debt_contract FOR UPDATE")).fetchall()

    used_slugs: set[str] = set()
    for (contract_id,) in existing_ids:
        slug = generate_contract_slug()
        # Retry on the (astronomically rare) in-loop collision.
        attempts = 0
        while slug in used_slugs:
            slug = generate_contract_slug()
            attempts += 1
            if attempts > 1000:
                raise RuntimeError(
                    "slug backfill: could not generate a unique slug after 1000 attempts"
                )
        used_slugs.add(slug)
        conn.execute(
            sa.text("UPDATE debt_contract SET slug = :slug WHERE id = :id"),
            {"slug": slug, "id": contract_id},
        )

    # Step 3: add the named unique constraint (enforces uniqueness at DB level).
    op.create_unique_constraint("uq_debt_contract_slug", "debt_contract", ["slug"])

    # Step 4: add a non-unique index to support fast lookups by slug (mirrors index=True on model).
    op.create_index("ix_debt_contract_slug", "debt_contract", ["slug"], unique=False)

    # Step 5: tighten to NOT NULL now that every row has a value and the constraint exists.
    op.alter_column(
        "debt_contract",
        "slug",
        existing_type=sa.Text(),
        nullable=False,
    )


def downgrade() -> None:
    op.drop_index("ix_debt_contract_slug", table_name="debt_contract")
    op.drop_constraint("uq_debt_contract_slug", "debt_contract", type_="unique")
    op.drop_column("debt_contract", "slug")
