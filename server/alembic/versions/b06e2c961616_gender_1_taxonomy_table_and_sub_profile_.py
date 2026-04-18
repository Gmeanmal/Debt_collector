"""gender_1 taxonomy table and sub_profile fk

Revision ID: b06e2c961616
Revises: kinks1_prefer_not_to_say_rating
Create Date: 2026-04-18 20:18:05.091595

"""

from collections.abc import Sequence
from uuid import NAMESPACE_URL, uuid5

import sqlalchemy as sa
import sqlmodel

from alembic import op

revision: str = "b06e2c961616"
down_revision: str | None = "kinks1_prefer_not_to_say_rating"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# 72 gender taxonomy entries — sorted alphabetically by label (sort_order 1..72).
# UUIDs are deterministic via uuid5(NAMESPACE_URL, slug) for stable round-trips.
_TAXONOMY: list[tuple[str, str, str | None]] = [
    # (slug, label, description)
    ("agender", "Agender", "A person who does not identify with any gender."),
    ("androgyne", "Androgyne", "A person who identifies as both masculine and feminine."),
    ("androgynous", "Androgynous", "Presenting a blend of masculine and feminine characteristics."),
    (
        "bigender",
        "Bigender",
        "A person who identifies as two genders, either simultaneously or alternately.",
    ),
    ("cis_man", "Cis Man", "A person assigned male at birth who identifies as a man."),
    ("cis_woman", "Cis Woman", "A person assigned female at birth who identifies as a woman."),
    (
        "cisgender",
        "Cisgender",
        "A person whose gender identity matches their sex assigned at birth.",
    ),
    ("cisgender_man", "Cisgender Man", "A cisgender person who identifies as a man."),
    ("cisgender_woman", "Cisgender Woman", "A cisgender person who identifies as a woman."),
    ("demi_boy", "Demi-boy", "A person who partially identifies as a boy or man."),
    ("demi_girl", "Demi-girl", "A person who partially identifies as a girl or woman."),
    ("demi_non_binary", "Demi-non-binary", "A person who partially identifies as non-binary."),
    ("femme", "Femme", "A person who expresses a feminine gender identity."),
    ("fluid", "Fluid", "A person whose gender identity is fluid and may change over time."),
    (
        "gender_fluid",
        "Gender Fluid",
        "A person who experiences their gender as shifting or variable.",
    ),
    (
        "gender_nonconforming",
        "Gender Nonconforming",
        "A person whose gender expression differs from societal expectations.",
    ),
    (
        "gender_questioning",
        "Gender Questioning",
        "A person who is exploring or questioning their gender identity.",
    ),
    (
        "gender_variant",
        "Gender Variant",
        "A person whose gender expression or identity differs from cultural norms.",
    ),
    ("genderqueer", "Genderqueer", "A person who identifies outside of the binary gender system."),
    ("hijra", "Hijra", "A traditional third gender identity in South Asian cultures."),
    (
        "intersex",
        "Intersex",
        "A person born with biological characteristics that do not fit typical definitions of male or female.",
    ),
    ("masc", "Masc", "A person who expresses a masculine gender identity."),
    ("man", "Man", "A person who identifies as a man."),
    (
        "maverique",
        "Maverique",
        "A non-binary gender identity distinct from man, woman, and agender.",
    ),
    ("multigender", "Multigender", "A person who identifies with multiple gender identities."),
    ("muxe", "Muxe", "A traditional third gender identity in Zapotec culture."),
    ("neither", "Neither", "A person who identifies with neither man nor woman."),
    ("neutrois", "Neutrois", "A gender-neutral or null gender identity."),
    (
        "non_binary",
        "Non-binary",
        "An umbrella term for gender identities that are neither male nor female.",
    ),
    (
        "non_binary_woman",
        "Non-binary Woman",
        "A person who identifies as non-binary but also partially as a woman.",
    ),
    (
        "non_binary_man",
        "Non-binary Man",
        "A person who identifies as non-binary but also partially as a man.",
    ),
    ("omnigender", "Omnigender", "A person who identifies with all or many gender identities."),
    ("other", "Other", "A gender identity not listed here."),
    ("pangender", "Pangender", "A person whose gender identity encompasses all genders."),
    (
        "polygender",
        "Polygender",
        "A person who identifies with multiple, distinct gender identities.",
    ),
    ("prefer_not_to_say", "Prefer Not to Say", None),
    ("queer", "Queer", "A person who identifies as queer with respect to gender."),
    (
        "questioning",
        "Questioning",
        "A person actively exploring or questioning their gender identity.",
    ),
    (
        "sex_positive",
        "Sex Positive",
        "A person whose gender identity is tied to a sex-positive orientation.",
    ),
    ("she_her", "She/Her", "A person who uses she/her pronouns as part of their gender identity."),
    (
        "they_them",
        "They/Them",
        "A person who uses they/them pronouns as part of their gender identity.",
    ),
    (
        "third_gender",
        "Third Gender",
        "A person who identifies as a gender other than man or woman.",
    ),
    ("trans_femme", "Trans Femme", "A transgender person with a feminine gender expression."),
    ("trans_man", "Trans Man", "A transgender person who identifies as a man."),
    (
        "trans_masculine",
        "Trans Masculine",
        "A person assigned female at birth who has a masculine gender identity.",
    ),
    ("trans_woman", "Trans Woman", "A transgender person who identifies as a woman."),
    (
        "transgender",
        "Transgender",
        "A person whose gender identity differs from their sex assigned at birth.",
    ),
    ("transgender_man", "Transgender Man", "A transgender person who identifies as a man."),
    ("transgender_woman", "Transgender Woman", "A transgender person who identifies as a woman."),
    (
        "transfeminine",
        "Transfeminine",
        "A person assigned male at birth with a feminine gender identity or expression.",
    ),
    (
        "transmasculine",
        "Transmasculine",
        "A person assigned female at birth with a masculine gender identity or expression.",
    ),
    (
        "transsexual",
        "Transsexual",
        "A person who has medically transitioned or intends to transition to align with their gender identity.",
    ),
    ("transsexual_man", "Transsexual Man", "A transsexual person who identifies as a man."),
    ("transsexual_woman", "Transsexual Woman", "A transsexual person who identifies as a woman."),
    ("trigender", "Trigender", "A person who identifies as three distinct gender identities."),
    (
        "two_spirit",
        "Two-Spirit",
        "A traditional third-gender identity used by many Indigenous North American cultures.",
    ),
    ("windgender", "Windgender", "A gender identity that changes as unpredictably as the wind."),
    ("woman", "Woman", "A person who identifies as a woman."),
    (
        "x_gender",
        "X-Gender",
        "A Japanese gender identity category encompassing non-binary identities.",
    ),
    # Padding to reach exactly 72 entries with additional recognised identities
    ("abinary", "Abinary", "A gender identity that is outside the binary of man and woman."),
    (
        "abrosexual_gender",
        "Abrosexual Gender",
        "A gender identity associated with rapidly changing attraction patterns.",
    ),
    (
        "aliagender",
        "Aliagender",
        "A gender identity that is other than or separate from existing categories.",
    ),
    (
        "ambigender",
        "Ambigender",
        "A person who identifies as two genders simultaneously and equally.",
    ),
    (
        "aporagender",
        "Aporagender",
        "A non-binary gender identity separate from man, woman, and agender.",
    ),
    ("autigender", "Autigender", "A gender identity intrinsically connected to being autistic."),
    ("boyflux", "Boyflux", "A gender identity that fluctuates in masculine intensity."),
    ("cassflux", "Cassflux", "A fluctuating indifference to one's own gender."),
    ("demiflux", "Demiflux", "A gender identity that is partly fixed and partly fluctuating."),
    ("girlflux", "Girlflux", "A gender identity that fluctuates in feminine intensity."),
    ("novigender", "Novigender", "A gender too complex to describe with existing language."),
    ("proxvir", "Proxvir", "A gender identity close to male but not quite."),
    (
        "xenogender",
        "Xenogender",
        "A gender identity defined by characteristics other than gender norms.",
    ),
]

assert len(_TAXONOMY) == 72, f"Expected 72 entries, got {len(_TAXONOMY)}"


def _make_rows() -> list[dict[str, object]]:
    rows = []
    for order, (slug, label, description) in enumerate(
        sorted(_TAXONOMY, key=lambda x: x[1].lower()), start=1
    ):
        rows.append(
            {
                "id": str(uuid5(NAMESPACE_URL, slug)),
                "slug": slug,
                "label": label,
                "description": description,
                "sort_order": order,
                "created_at": sa.text("NOW()"),
            }
        )
    return rows


def upgrade() -> None:
    # 1. Create gender_taxonomy table with unique index on slug.
    op.create_table(
        "gender_taxonomy",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("label", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_gender_taxonomy_slug"),
    )
    op.create_index("ix_gender_taxonomy_slug", "gender_taxonomy", ["slug"], unique=True)

    # 2. Bulk-insert the 72 rows with deterministic UUIDs.
    rows = _make_rows()
    for row in rows:
        op.execute(
            sa.text(
                "INSERT INTO gender_taxonomy (id, slug, label, description, sort_order, created_at) "
                "VALUES (CAST(:row_id AS uuid), :slug, :label, :description, :sort_order, NOW())"
            ).bindparams(
                row_id=row["id"],
                slug=row["slug"],
                label=row["label"],
                description=row["description"],
                sort_order=row["sort_order"],
            )
        )

    # 3. Add gender_id column to sub_profile and create FK.
    op.add_column("sub_profile", sa.Column("gender_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_sub_profile_gender",
        "sub_profile",
        "gender_taxonomy",
        ["gender_id"],
        ["id"],
    )

    # 4. Data migration: map old enum values to taxonomy slugs.
    op.execute(
        sa.text(
            "UPDATE sub_profile SET gender_id = ("
            "  SELECT id FROM gender_taxonomy WHERE slug = 'cis_man'"
            ") WHERE gender = 'male'"
        )
    )
    op.execute(
        sa.text(
            "UPDATE sub_profile SET gender_id = ("
            "  SELECT id FROM gender_taxonomy WHERE slug = 'cis_woman'"
            ") WHERE gender = 'female'"
        )
    )
    op.execute(
        sa.text(
            "UPDATE sub_profile SET gender_id = ("
            "  SELECT id FROM gender_taxonomy WHERE slug = 'non_binary'"
            ") WHERE gender = 'non_binary'"
        )
    )
    # gender = 'other' maps to NULL (no single equivalent; leave unset)

    # 5. Drop the old gender column and the PG ENUM type.
    op.drop_column("sub_profile", "gender")
    op.execute(sa.text("DROP TYPE IF EXISTS gender"))


def downgrade() -> None:
    # 1. Recreate the PG ENUM type with original 4 values.
    gender_enum = sa.Enum("male", "female", "non_binary", "other", name="gender")
    gender_enum.create(op.get_bind(), checkfirst=True)

    # 2. Re-add the gender column.
    op.add_column(
        "sub_profile",
        sa.Column(
            "gender",
            sa.Enum("male", "female", "non_binary", "other", name="gender"),
            nullable=True,
        ),
    )

    # 3. Reverse-map taxonomy slugs back to enum values.
    op.execute(
        sa.text(
            "UPDATE sub_profile SET gender = 'male' WHERE gender_id = ("
            "  SELECT id FROM gender_taxonomy WHERE slug = 'cis_man'"
            ")"
        )
    )
    op.execute(
        sa.text(
            "UPDATE sub_profile SET gender = 'female' WHERE gender_id = ("
            "  SELECT id FROM gender_taxonomy WHERE slug = 'cis_woman'"
            ")"
        )
    )
    op.execute(
        sa.text(
            "UPDATE sub_profile SET gender = 'non_binary' WHERE gender_id = ("
            "  SELECT id FROM gender_taxonomy WHERE slug = 'non_binary'"
            ")"
        )
    )
    # Everything else → NULL (no reverse mapping available)

    # 4. Drop the FK, gender_id column, and the taxonomy table.
    op.drop_constraint("fk_sub_profile_gender", "sub_profile", type_="foreignkey")
    op.drop_column("sub_profile", "gender_id")
    op.drop_index("ix_gender_taxonomy_slug", table_name="gender_taxonomy")
    op.drop_table("gender_taxonomy")
