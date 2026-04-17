from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class SurprisePenaltyPreviewIn(BaseModel):
    amount_gbp: Decimal = Field(
        ...,
        gt=0,
        le=100000,
        max_digits=12,
        decimal_places=2,
        description="Flat penalty amount to preview (GBP). Must be > 0 and <= £100,000.",
        examples=["50.00"],
    )


class SurprisePenaltyPreviewOut(BaseModel):
    contract_slug: str = Field(
        ..., description="Slug of the target contract", examples=["c_a7k2mq"]
    )
    current_outstanding: Decimal = Field(
        ...,
        description="Current contract balance before the penalty (GBP)",
        examples=["320.00"],
    )
    delta: Decimal = Field(
        ...,
        description="Penalty amount that would be applied (GBP)",
        examples=["50.00"],
    )
    new_outstanding: Decimal = Field(
        ...,
        description="Projected balance after the penalty would be applied (GBP)",
        examples=["370.00"],
    )


class SurprisePenaltyCommitIn(BaseModel):
    amount_gbp: Decimal = Field(
        ...,
        gt=0,
        le=100000,
        max_digits=12,
        decimal_places=2,
        description="Flat penalty amount to apply (GBP). Must be > 0 and <= £100,000.",
        examples=["50.00"],
    )
    reason: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Mandatory reason for the surprise penalty, recorded on the ledger event.",
        examples=["Missed check-in protocol three times this week."],
    )
    confirmed_at: datetime = Field(
        ...,
        description=(
            "ISO-8601 UTC datetime from the confirmation modal, proving the goddess acknowledged "
            "the preview before submitting the commit. Stored in the ContractAdjustment record."
        ),
        examples=["2026-04-17T14:30:00Z"],
    )


class BuyoutPreviewOut(BaseModel):
    contract_slug: str = Field(
        ..., description="Slug of the target contract", examples=["c_a7k2mq"]
    )
    current_balance: Decimal = Field(
        ...,
        description="Current outstanding contract balance (GBP)",
        examples=["480.00"],
    )
    exit_amount: Decimal = Field(
        ...,
        description="Pro-rated buyout amount due at this point in the contract term (GBP)",
        examples=["350.00"],
    )
    payoff_delta: Decimal = Field(
        ...,
        description=(
            "Difference between current balance and exit amount (GBP). "
            "Positive means the buyout is cheaper than paying off the full balance."
        ),
        examples=["130.00"],
    )


class BreachPreviewIn(BaseModel):
    # reason captured for audit trail on commit step, unused in preview
    reason: str = Field(
        ...,
        min_length=0,
        max_length=500,
        description=(
            "Reason for the breach. May be empty string on preview requests "
            "(frontend sends an empty value before the goddess has typed anything). "
            "A non-empty value is required only when the commit step fires."
        ),
        examples=["Sub disappeared without warning and stopped all contact.", ""],
    )


class BreachPreviewOut(BaseModel):
    active_contracts_to_cascade: int = Field(
        ...,
        description=(
            "Number of active debt contracts that would transition to `breached` "
            "if the breach is confirmed (includes the triggering contract and all others)."
        ),
        examples=[2],
    )
    rolling_balance_to_freeze: Decimal = Field(
        ...,
        description=(
            "Sum of balances across all active contracts that would be captured in the "
            "blacklist entry snapshot (GBP)."
        ),
        examples=["640.00"],
    )
    will_blacklist: bool = Field(
        ...,
        description=(
            "Always true when the sub has at least one active contract. "
            "False only when the sub is already blacklisted (edge case guard)."
        ),
        examples=[True],
    )
