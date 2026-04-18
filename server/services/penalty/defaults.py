"""Seed default penalty rules and reward tiers for a newly created goddess.

Call ``seed_defaults_for_goddess`` immediately after the goddess row is flushed
and has an ``id``. The function is idempotent: rows are skipped when a rule or
tier with the same ``(goddess_id, name)`` already exists.

The caller is responsible for committing the session.
"""

from decimal import Decimal
from typing import TypedDict
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.penalty_rule import PenaltyAction, PenaltyRule, PenaltyTrigger
from models.reward_tier import RewardTier


class _RuleSpec(TypedDict):
    name: str
    trigger: PenaltyTrigger
    action: PenaltyAction
    points_delta: int
    fee_amount: Decimal | None
    fee_percent: Decimal | None
    min_days_late: int
    cooldown_hours: int


class _TierSpec(TypedDict):
    name: str
    description: str
    cost: int


_DEFAULT_RULES: list[_RuleSpec] = [
    {
        "name": "late_2d_notify",
        "trigger": PenaltyTrigger.rolling_late,
        "action": PenaltyAction.notify_only,
        "points_delta": 0,
        "fee_amount": None,
        "fee_percent": None,
        "min_days_late": 2,
        "cooldown_hours": 48,
    },
    {
        "name": "late_7d_5pct_fee",
        "trigger": PenaltyTrigger.rolling_late,
        "action": PenaltyAction.apply_fee,
        "points_delta": -3,
        "fee_amount": None,
        "fee_percent": Decimal("5.00"),
        "min_days_late": 7,
        "cooldown_hours": 168,
    },
    {
        "name": "late_14d_breach_warn",
        "trigger": PenaltyTrigger.rolling_late,
        "action": PenaltyAction.notify_only,
        "points_delta": -10,
        "fee_amount": None,
        "fee_percent": None,
        "min_days_late": 14,
        "cooldown_hours": 336,
    },
]

_DEFAULT_TIERS: list[_TierSpec] = [
    {"name": "bronze", "description": "1 month perfect", "cost": 30},
    {"name": "silver", "description": "3 months perfect", "cost": 90},
    {"name": "gold", "description": "6 months perfect", "cost": 180},
    {"name": "crown", "description": "12 months perfect", "cost": 365},
]


async def seed_defaults_for_goddess(session: AsyncSession, goddess_id: UUID) -> None:
    """Insert the 3 default penalty rules and 4 reward tiers for a new goddess.

    Idempotent: rows whose (goddess_id, name) pair already exists are skipped.
    Does not commit — the caller owns the transaction boundary.
    """
    existing_rule_names = await _existing_rule_names(session, goddess_id)
    for spec in _DEFAULT_RULES:
        if spec["name"] in existing_rule_names:
            continue
        session.add(
            PenaltyRule(
                goddess_id=goddess_id,
                sub_id=None,
                trigger=spec["trigger"],
                action=spec["action"],
                points_delta=spec["points_delta"],
                fee_amount=spec["fee_amount"],
                name=spec["name"],
                fee_percent=spec["fee_percent"],
                min_days_late=spec["min_days_late"],
                cooldown_hours=spec["cooldown_hours"],
                active=True,
            )
        )

    existing_tier_names = await _existing_tier_names(session, goddess_id)
    for spec in _DEFAULT_TIERS:
        if spec["name"] in existing_tier_names:
            continue
        session.add(
            RewardTier(
                goddess_id=goddess_id,
                name=spec["name"],
                description=spec["description"],
                cost=spec["cost"],
                active=True,
            )
        )

    await session.flush()


async def _existing_rule_names(session: AsyncSession, goddess_id: UUID) -> set[str]:
    result = await session.execute(
        select(PenaltyRule.name).where(
            col(PenaltyRule.goddess_id) == goddess_id,
            col(PenaltyRule.name).is_not(None),
        )
    )
    return {row for (row,) in result.all()}


async def _existing_tier_names(session: AsyncSession, goddess_id: UUID) -> set[str]:
    result = await session.execute(
        select(RewardTier.name).where(col(RewardTier.goddess_id) == goddess_id)
    )
    return {row for (row,) in result.all()}
