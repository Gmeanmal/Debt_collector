from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from models.sub_kink_rating import KinkRating


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
            "True when the underlying kink_item is safety-flagged AND the rating is one of "
            "`curious`, `loves`, or `fetish_need`. The client must surface a confirmation "
            "prompt before persisting or acting on ratings for which this is True."
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
            "True when the item is safety-flagged AND the current rating is `curious`, "
            "`loves`, or `fetish_need`. Drives the client-side confirmation cue."
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
            "Kink taxonomy grouped by category, with each item's current rating "
            "for the target sub."
        ),
    )
