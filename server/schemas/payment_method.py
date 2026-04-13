from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from models.payment_method import PaymentMethodType


class PaymentMethodCreate(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Display label for this payment method",
        examples=["Throne — jane-mm"],
    )
    type: PaymentMethodType = Field(
        ...,
        description="Category of payment method",
        examples=["throne"],
    )
    handle_or_link: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="The @handle, URL, or account reference for this method",
        examples=["@jane-mm"],
    )
    note: str | None = Field(
        default=None,
        description="Optional free-text note visible to Goddess only",
        examples=["Primary tribute method"],
    )
    enabled: bool = Field(
        default=True,
        description="Whether this method is active and shown to subs",
        examples=[True],
    )


class PaymentMethodUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
        description="Updated display label",
        examples=["Throne — jane-mm"],
    )
    type: PaymentMethodType | None = Field(
        default=None,
        description="Updated payment method category",
        examples=["paypal"],
    )
    handle_or_link: str | None = Field(
        default=None,
        min_length=1,
        max_length=500,
        description="Updated @handle, URL, or account reference",
        examples=["paypal.me/jane-mm"],
    )
    note: str | None = Field(
        default=None,
        description="Updated free-text note",
        examples=["Secondary method"],
    )
    enabled: bool | None = Field(
        default=None,
        description="Enable or disable this method",
        examples=[False],
    )


class PaymentMethodOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Payment method UUID",
        examples=["00000000-0000-0000-0000-000000000001"],
    )
    name: str = Field(
        ...,
        description="Display label for this payment method",
        examples=["Throne — jane-mm"],
    )
    type: PaymentMethodType = Field(
        ...,
        description="Category of payment method",
        examples=["throne"],
    )
    handle_or_link: str = Field(
        ...,
        description="The @handle, URL, or account reference",
        examples=["@jane-mm"],
    )
    note: str | None = Field(
        default=None,
        description="Optional free-text note",
        examples=["Primary tribute method"],
    )
    enabled: bool = Field(
        ...,
        description="Whether this method is active",
        examples=[True],
    )
    sort_order: int = Field(
        ...,
        description="Display order (ascending = top)",
        examples=[0],
    )
    created_at: datetime = Field(
        ...,
        description="UTC datetime when the method was created",
    )
    updated_at: datetime = Field(
        ...,
        description="UTC datetime when the method was last updated",
    )

    model_config = {"from_attributes": True}


class ReorderRequest(BaseModel):
    method_ids: list[UUID] = Field(
        ...,
        description="Payment method IDs in the desired display order (index 0 = top)",
        examples=[
            [
                "00000000-0000-0000-0000-000000000001",
                "00000000-0000-0000-0000-000000000002",
            ]
        ],
    )
