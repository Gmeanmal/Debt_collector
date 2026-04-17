from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from models.payment import AllocationTargetType, DeclarationSource, PaymentCategory, PaymentStatus
from models.payment_method import PaymentMethodType


class DeclarePaymentIn(BaseModel):
    amount: Decimal = Field(
        ...,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Payment amount in GBP",
        examples=["30.00"],
    )
    method_id: UUID = Field(
        ...,
        description="UUID of the payment method used",
        examples=["00000000-0000-0000-0000-000000000001"],
    )
    category: PaymentCategory = Field(
        ...,
        description="Payment category — determines ledger routing",
        examples=["entry"],
    )
    external_timestamp: datetime | None = Field(
        default=None,
        description="UTC datetime when the payment was actually made (sub-reported)",
        examples=["2026-04-13T12:00:00"],
    )
    note: str | None = Field(
        default=None,
        max_length=1000,
        description="Optional note from the sub",
        examples=["Sent via Throne"],
    )
    target_id: UUID | None = Field(
        default=None,
        description=(
            "Polymorphic target — contract or rolling cycle ID (required for some categories)"
        ),
        examples=[None],
    )


class RecordPaymentIn(DeclarePaymentIn):
    sub_id: UUID = Field(
        ...,
        description="UUID of the sub on whose behalf the goddess is recording",
        examples=["00000000-0000-0000-0000-000000000002"],
    )


class EditDeclarationIn(BaseModel):
    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Updated payment amount in GBP",
        examples=["30.00"],
    )
    method_id: UUID | None = Field(
        default=None,
        description="Updated payment method UUID",
        examples=["00000000-0000-0000-0000-000000000001"],
    )
    category: PaymentCategory | None = Field(
        default=None,
        description="Updated payment category",
        examples=["tribute"],
    )
    external_timestamp: datetime | None = Field(
        default=None,
        description="Updated external payment timestamp",
        examples=["2026-04-13T12:00:00"],
    )
    note: str | None = Field(
        default=None,
        max_length=1000,
        description="Updated note",
        examples=["Corrected note"],
    )
    target_id: UUID | None = Field(
        default=None,
        description="Updated polymorphic target ID",
        examples=[None],
    )


class ValidateIn(BaseModel):
    recategorize_to: PaymentCategory | None = Field(
        default=None,
        description="Optional new category to assign before validating",
        examples=[None],
    )


class RejectIn(BaseModel):
    reason: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Rejection reason shown to the sub (min 5 chars).",
        examples=["Wrong amount — expected £30.00"],
    )


class AllocationOut(BaseModel):
    target_type: AllocationTargetType = Field(
        ...,
        description="What ledger bucket received this allocation",
        examples=["entry"],
    )
    target_id: UUID | None = Field(
        default=None,
        description="Polymorphic target ID (None for entry/tribute)",
        examples=[None],
    )
    amount: Decimal = Field(
        ...,
        description="Allocated amount in GBP",
        examples=["30.00"],
    )
    allocated_at: datetime = Field(
        ...,
        description="UTC datetime when the allocation was emitted",
    )

    model_config = {"from_attributes": True}


class PaymentOut(BaseModel):
    id: UUID = Field(
        ...,
        description="Declaration UUID",
        examples=["00000000-0000-0000-0000-000000000001"],
    )
    sub_id: UUID = Field(..., description="Sub user UUID")
    sub_display_name: str | None = Field(
        default=None, description="Sub display name (first + last)"
    )
    goddess_id: UUID = Field(..., description="Goddess UUID")
    method_id: UUID = Field(..., description="Payment method UUID")
    method_name: str | None = Field(default=None, description="Payment method display name")
    method_type: PaymentMethodType | None = Field(
        default=None,
        description="Payment method type (brand key)",
        examples=["paypal"],
    )
    amount: Decimal = Field(..., description="Payment amount in GBP", examples=["30.00"])
    external_timestamp: datetime | None = Field(
        default=None, description="Sub-reported payment datetime"
    )
    note: str | None = Field(default=None, description="Note from the declarer")
    category: PaymentCategory = Field(..., description="Payment category", examples=["entry"])
    status: PaymentStatus = Field(..., description="Declaration status", examples=["pending"])
    target_id: UUID | None = Field(default=None, description="Polymorphic target ID")
    created_by: UUID = Field(..., description="UUID of user who created this declaration")
    declared_at: datetime = Field(..., description="UTC datetime of declaration")
    validated_at: datetime | None = Field(
        default=None, description="UTC datetime of validation/rejection"
    )
    validated_by: UUID | None = Field(
        default=None, description="UUID of goddess who validated/rejected"
    )
    rejection_reason: str | None = Field(
        default=None, description="Reason for rejection if rejected"
    )
    source: DeclarationSource = Field(
        ...,
        description="Who declared this payment.",
        examples=["sub_declared"],
    )
    allocation: AllocationOut | None = Field(
        default=None, description="Allocation record if validated"
    )

    model_config = {"from_attributes": True}
