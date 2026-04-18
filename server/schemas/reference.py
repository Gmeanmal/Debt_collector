from uuid import UUID

from pydantic import BaseModel, Field


class GenderTaxonomyOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Stable UUID for this gender taxonomy entry.",
        examples=["a1b2c3d4-0000-5000-8000-000000000001"],
    )
    slug: str = Field(
        ...,
        description="Machine-stable identifier (lowercase_underscored).",
        examples=["non_binary"],
    )
    label: str = Field(
        ...,
        description="Human-readable label shown in the UI.",
        examples=["Non-binary"],
    )
    description: str | None = Field(
        default=None,
        description="Optional one-line description of this gender identity.",
        examples=["An umbrella term for gender identities that are neither male nor female."],
    )
    sort_order: int = Field(
        ...,
        description="Ascending sort position (1–72, alphabetical by label).",
        examples=[38],
    )

    model_config = {"from_attributes": True}
