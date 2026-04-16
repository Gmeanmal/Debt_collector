from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from models.wishlist_item import WishlistCreatedBy, WishlistStatus


class WishlistItemCreateIn(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Short human-readable title for the wishlist item",
        examples=["New latex corset"],
    )
    description: str | None = Field(
        default=None,
        description="Optional long-form description",
        examples=["Red latex, size M, from Honour"],
    )
    image_url: str | None = Field(
        default=None,
        description="Optional image URL (product photo, Throne image, etc.)",
        examples=["https://example.com/corset.jpg"],
    )
    external_url: str | None = Field(
        default=None,
        description="Optional external product URL (Amazon, Throne, etc.)",
        examples=["https://throne.me/u/goddess/wish/123"],
    )
    target_amount: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Target amount in GBP to collect before the item is fulfilled",
        examples=["250.00"],
    )
    sub_id: UUID | None = Field(
        default=None,
        description=(
            "Optional sub UUID to restrict the item to a single sub. "
            "Omit to make the item visible to every sub under this goddess."
        ),
        examples=[None],
    )


class WishlistItemProposeIn(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Short human-readable title for the proposed item",
        examples=["Silk rope set"],
    )
    description: str | None = Field(
        default=None,
        description="Optional long-form description",
        examples=["10m, black, shibari-grade"],
    )
    image_url: str | None = Field(
        default=None,
        description="Optional image URL",
        examples=["https://example.com/rope.jpg"],
    )
    external_url: str | None = Field(
        default=None,
        description="Optional external product URL",
        examples=["https://amazon.co.uk/dp/XXXXXXX"],
    )
    target_amount: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Target amount in GBP to collect before the item is fulfilled",
        examples=["75.00"],
    )


class WishlistItemUpdateIn(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
        description="Updated title",
        examples=["Black latex corset"],
    )
    description: str | None = Field(
        default=None,
        description="Updated description",
        examples=["Size S, matte finish"],
    )
    image_url: str | None = Field(
        default=None,
        description="Updated image URL",
        examples=["https://example.com/new.jpg"],
    )
    external_url: str | None = Field(
        default=None,
        description="Updated external product URL",
        examples=["https://throne.me/u/goddess/wish/456"],
    )
    target_amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Updated target amount in GBP",
        examples=["300.00"],
    )
    sub_id: UUID | None = Field(
        default=None,
        description="Updated sub scope (pass null to broaden to all subs)",
        examples=[None],
    )
    status: WishlistStatus | None = Field(
        default=None,
        description="Updated status. `fulfilled` is automatic and cannot be set manually.",
        examples=["cancelled"],
    )


class WishlistItemOut(BaseModel):
    id: UUID = Field(..., description="Wishlist item UUID")
    goddess_id: UUID = Field(..., description="Owning goddess UUID")
    sub_id: UUID | None = Field(
        default=None,
        description="Restricting sub UUID, or null when visible to all subs",
    )
    title: str = Field(..., description="Title", examples=["New latex corset"])
    description: str | None = Field(default=None, description="Description")
    image_url: str | None = Field(default=None, description="Image URL")
    external_url: str | None = Field(default=None, description="External product URL")
    target_amount: Decimal = Field(
        ...,
        description="Target amount in GBP",
        examples=["250.00"],
    )
    collected: Decimal = Field(
        ...,
        description="Sum of validated wishlist_goal allocations pointing at this item",
        examples=["120.00"],
    )
    status: WishlistStatus = Field(..., description="Item status", examples=["open"])
    created_by: WishlistCreatedBy = Field(
        ...,
        description="Who created the item",
        examples=["goddess"],
    )
    approved: bool = Field(
        ...,
        description="Whether the goddess has approved the item (true for goddess-created)",
        examples=[True],
    )
    created_at: datetime = Field(..., description="UTC datetime when the item was created")
    updated_at: datetime = Field(..., description="UTC datetime of last update")
    fulfilled_at: datetime | None = Field(
        default=None,
        description="UTC datetime when the collected total first reached the target",
    )

    model_config = {"from_attributes": True}
