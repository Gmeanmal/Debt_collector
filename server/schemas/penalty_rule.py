from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from models.penalty_rule import PenaltyAction, PenaltyTrigger


class PenaltyRuleIn(BaseModel):
    sub_id: UUID | None = Field(
        default=None,
        description=(
            "Optional sub UUID to scope the rule to a single sub. "
            "Omit to apply the rule to every sub under this goddess."
        ),
        examples=[None],
    )
    trigger: PenaltyTrigger = Field(
        ...,
        description="Domain event that causes the rule to fire",
        examples=["ritual_missed"],
    )
    action: PenaltyAction = Field(
        ...,
        description=(
            "How the engine reacts when the trigger fires. "
            "``notify_only`` logs a penalty_event but does not touch the balance. "
            "``apply_points`` emits a merit_event with ``points_delta`` applied. "
            "``apply_fee`` stores the configured ``fee_amount`` for future use "
            "(not wired into any cron yet)."
        ),
        examples=["apply_points"],
    )
    points_delta: int = Field(
        default=0,
        description=(
            "Merit delta applied when ``action=apply_points``. "
            "Negative values are expected for debits."
        ),
        examples=[-5],
    )
    fee_amount: Decimal | None = Field(
        default=None,
        max_digits=12,
        decimal_places=2,
        description=(
            "GBP fee stored when ``action=apply_fee``. "
            "Currently informational only — no cron applies it yet."
        ),
        examples=["10.00"],
    )
    name: str | None = Field(
        default=None,
        description=(
            "Short identifier for the rule (e.g. 'late_2d_notify'). "
            "Nullable for ad-hoc rules."
        ),
        examples=["late_2d_notify"],
    )
    fee_percent: Decimal | None = Field(
        default=None,
        max_digits=5,
        decimal_places=2,
        description=(
            "Percentage of the sub's minimum payment charged when action=apply_fee. "
            "Must be in [0, 100]. The engine computes the GBP amount at fire time."
        ),
        examples=["5.00"],
    )
    min_days_late: int | None = Field(
        default=None,
        ge=0,
        description=(
            "Minimum days a rolling payment must be overdue before this rule fires. "
            "The engine selects the rule with the highest min_days_late <= current days late."
        ),
        examples=[2],
    )
    cooldown_hours: int = Field(
        default=24,
        ge=0,
        description=(
            "Minimum number of hours between two fires of this rule for the same "
            "(sub, source_kind, source_id) tuple. Second fire within the window is suppressed."
        ),
        examples=[24],
    )
    active: bool = Field(
        default=True,
        description="Inactive rules are ignored by the engine",
        examples=[True],
    )


class PenaltyRuleUpdate(BaseModel):
    sub_id: UUID | None = Field(
        default=None,
        description="Updated sub scope; pass null to broaden the rule to every sub",
        examples=[None],
    )
    trigger: PenaltyTrigger | None = Field(
        default=None,
        description="Updated trigger",
        examples=["task_missed"],
    )
    action: PenaltyAction | None = Field(
        default=None,
        description="Updated action",
        examples=["notify_only"],
    )
    points_delta: int | None = Field(
        default=None,
        description="Updated merit delta applied on fire",
        examples=[-3],
    )
    fee_amount: Decimal | None = Field(
        default=None,
        max_digits=12,
        decimal_places=2,
        description="Updated fee amount; null clears it",
        examples=["15.00"],
    )
    name: str | None = Field(
        default=None,
        description="Updated rule identifier; null clears it",
        examples=["late_7d_5pct_fee"],
    )
    fee_percent: Decimal | None = Field(
        default=None,
        max_digits=5,
        decimal_places=2,
        description="Updated fee percentage; must be in [0, 100]; null clears it",
        examples=["10.00"],
    )
    min_days_late: int | None = Field(
        default=None,
        ge=0,
        description="Updated minimum days late threshold; null clears it",
        examples=[7],
    )
    cooldown_hours: int | None = Field(
        default=None,
        ge=0,
        description="Updated cooldown window in hours",
        examples=[12],
    )
    active: bool | None = Field(
        default=None,
        description="Updated active flag",
        examples=[False],
    )


class PenaltyRuleOut(BaseModel):
    id: UUID = Field(..., description="Penalty rule UUID")
    goddess_id: UUID = Field(..., description="Owning goddess UUID")
    sub_id: UUID | None = Field(
        default=None,
        description="Sub UUID when the rule is scoped to a single sub; null when goddess-wide",
    )
    trigger: PenaltyTrigger = Field(..., description="Domain event that causes the rule to fire")
    action: PenaltyAction = Field(..., description="Engine reaction when the trigger fires")
    points_delta: int = Field(..., description="Merit delta applied when action=apply_points")
    fee_amount: Decimal | None = Field(
        default=None,
        description="GBP fee stored for action=apply_fee; null otherwise",
        examples=["10.00"],
    )
    name: str | None = Field(
        default=None,
        description="Short identifier for the rule; null for ad-hoc rules",
    )
    fee_percent: Decimal | None = Field(
        default=None,
        description="Percentage of minimum payment charged on apply_fee; null when not applicable",
        examples=["5.00"],
    )
    min_days_late: int | None = Field(
        default=None,
        description=(
            "Minimum days overdue before this rolling_late rule fires; "
            "null means no threshold"
        ),
        examples=[2],
    )
    cooldown_hours: int = Field(..., description="Cooldown window in hours", examples=[24])
    active: bool = Field(..., description="Whether the engine considers this rule")
    created_at: datetime = Field(..., description="UTC datetime when the rule was created")
    updated_at: datetime = Field(..., description="UTC datetime of last update")

    model_config = {"from_attributes": True}
