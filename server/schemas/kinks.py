from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from models.sub_kink_rating import KinkRating


class KinkProposeIn(BaseModel):
    category_id: UUID = Field(
        ...,
        description="Category under which the proposed kink item should be placed",
        examples=["c1a2b3d4-e5f6-7890-abcd-ef1234567890"],
    )
    label: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Human-readable label for the proposed item",
        examples=["Sensory deprivation hood"],
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
        description="Optional long-form description of the item",
        examples=["Full-coverage hood that eliminates sight and reduces hearing."],
    )
    safety_flag: bool = Field(
        default=False,
        description="Whether the proposer considers this item safety-critical",
        examples=[False],
    )


class KinkProposalOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Identifier of the proposed kink item",
        examples=["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
    )
    category_id: UUID = Field(
        ...,
        description="Category the proposal belongs to",
        examples=["c1a2b3d4-e5f6-7890-abcd-ef1234567890"],
    )
    slug: str = Field(
        ...,
        description="Auto-generated slug for the proposed item",
        examples=["sensory-deprivation-hood-a3f9"],
    )
    label: str = Field(
        ...,
        description="Human-readable label for the proposed item",
        examples=["Sensory deprivation hood"],
    )
    description: str | None = Field(
        default=None,
        description="Optional long-form description of the item",
        examples=["Full-coverage hood that eliminates sight and reduces hearing."],
    )
    safety_flag: bool = Field(
        ...,
        description="Whether the item is flagged as safety-critical",
        examples=[False],
    )
    approved: bool = Field(
        ...,
        description="Whether the proposal has been approved by the goddess",
        examples=[False],
    )
    proposed_by: UUID | None = Field(
        default=None,
        description="User ID of the sub who proposed this item",
        examples=["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
    )
    proposer_username: str | None = Field(
        default=None,
        description="Username of the sub who proposed this item",
        examples=["slave_john"],
    )
    created_at: datetime = Field(
        ...,
        description="UTC datetime when the proposal was submitted",
    )


class SubKinkRatingIn(BaseModel):
    rating: KinkRating = Field(
        ...,
        description="The sub's rating for this kink item",
        examples=["curious"],
    )
    note: str | None = Field(
        default=None,
        max_length=2000,
        description="Free-text note the sub attaches to this rating (private to sub + goddess)",
        examples=["only with prior negotiation"],
    )


class SubKinkRatingOut(BaseModel):
    item_id: UUID = Field(
        ...,
        description="Identifier of the kink_item this rating applies to",
        examples=["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
    )
    rating: KinkRating = Field(
        ...,
        description="The persisted rating for the kink item",
        examples=["loves"],
    )
    note: str | None = Field(
        default=None,
        description="Free-text note attached to the rating, if any",
        examples=["hard limit unless explicitly negotiated"],
    )
    needs_confirmation: bool = Field(
        ...,
        description=(
            "True when the underlying kink_item is safety-flagged AND the rating is `loves` "
            "or `fetish_need`. The client must surface an explicit consent acknowledgement "
            "before persisting ratings for which this is True."
        ),
        examples=[True],
    )
    updated_at: datetime = Field(
        ...,
        description="UTC datetime when the rating was last written",
    )


class KinkItemOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Identifier of the kink item",
        examples=["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
    )
    slug: str = Field(
        ...,
        description="Stable machine slug for the item",
        examples=["rope_bondage"],
    )
    label: str = Field(
        ...,
        description="Human-readable label for the item",
        examples=["Rope bondage"],
    )
    description: str | None = Field(
        default=None,
        description="Optional long-form description of the item",
        examples=["Decorative or restraining rope work; includes shibari."],
    )
    safety_flag: bool = Field(
        ...,
        description="True when this item is tagged safety-critical and requires caution.",
        examples=[True],
    )
    is_custom: bool = Field(
        ...,
        description="True when this item was proposed by a sub rather than seeded globally.",
        examples=[False],
    )
    rating: KinkRating = Field(
        ...,
        description="The sub's current rating for this item; `not_set` when no rating exists.",
        examples=["not_set"],
    )
    note: str | None = Field(
        default=None,
        description="Free-text note attached to the rating, if any",
        examples=[None],
    )
    needs_confirmation: bool = Field(
        ...,
        description=(
            "True when the item is safety-flagged AND the current rating is `loves` or "
            "`fetish_need`. Drives the client-side consent-acknowledgement cue."
        ),
        examples=[False],
    )


class KinkCategoryOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Identifier of the kink category",
        examples=["c1a2b3d4-e5f6-7890-abcd-ef1234567890"],
    )
    slug: str = Field(
        ...,
        description="Stable machine slug for the category",
        examples=["pain_endurance"],
    )
    label: str = Field(
        ...,
        description="Human-readable label for the category",
        examples=["Pain & endurance"],
    )
    safety_flag: bool = Field(
        ...,
        description="True when the category as a whole is tagged safety-critical.",
        examples=[True],
    )
    sort_order: int = Field(
        ...,
        description="Ascending order used to render categories in the matrix.",
        examples=[50],
    )
    items: list[KinkItemOut] = Field(
        ...,
        description="Items under this category, visible to the target sub's goddess.",
    )


class KinkMatrixOut(BaseModel):
    categories: list[KinkCategoryOut] = Field(
        ...,
        description=(
            "Kink taxonomy grouped by category, with each item's current rating for the target sub."
        ),
    )


class KinkOverviewItemOut(BaseModel):
    item_id: UUID = Field(
        ...,
        description="Identifier of the kink item",
        examples=["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
    )
    slug: str = Field(
        ...,
        description="Stable machine slug for the item",
        examples=["rope_bondage"],
    )
    label: str = Field(
        ...,
        description="Human-readable label for the item",
        examples=["Rope bondage"],
    )
    category_label: str = Field(
        ...,
        description="Human-readable label of the item's category",
        examples=["Bondage"],
    )
    category_sort_order: int = Field(
        ...,
        description="Ascending sort order of the parent category, used for grouping",
        examples=[10],
    )
    safety_flag: bool = Field(
        ...,
        description="True when this item is tagged safety-critical",
        examples=[False],
    )
    counts: dict[str, int] = Field(
        ...,
        description=(
            "Map of KinkRating value to the number of this goddess's subs who set that rating. "
            "Every KinkRating key is always present (zero-filled for ratings with no explicit row)."
        ),
        examples=[
            {
                "hard_limit": 1,
                "soft_limit": 2,
                "not_set": 5,
                "curious": 3,
                "loves": 1,
                "fetish_need": 0,
            }
        ],
    )


class KinkOverviewOut(BaseModel):
    total_subs: int = Field(
        ...,
        description="Total number of subs assigned to this goddess",
        examples=[12],
    )
    items: list[KinkOverviewItemOut] = Field(
        ...,
        description=(
            "One row per kink item visible to this goddess (global + her custom items). "
            "Ordered by category sort_order then item slug."
        ),
    )
