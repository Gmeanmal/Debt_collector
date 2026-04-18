import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import NotFound
from models.penalty_rule import (
    PenaltyAction,
    PenaltyEvent,
    PenaltyRule,
    PenaltyTrigger,
)


class PenaltyRuleDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_goddess(self, goddess_id: UUID) -> list[PenaltyRule]:
        """Return every penalty rule owned by the given goddess, oldest first."""
        result = await self._session.execute(
            select(PenaltyRule)
            .where(col(PenaltyRule.goddess_id) == goddess_id)
            .order_by(col(PenaltyRule.created_at).asc())
        )
        return list(result.scalars().all())

    async def get(self, rule_id: UUID) -> PenaltyRule:
        """Return a penalty rule by id, raising NotFound if absent."""
        row = await self._session.get(PenaltyRule, rule_id)
        if row is None:
            raise NotFound(f"penalty_rule {rule_id} not found")
        return row

    async def create(
        self,
        *,
        goddess_id: UUID,
        sub_id: UUID | None,
        trigger: PenaltyTrigger,
        action: PenaltyAction,
        points_delta: int,
        fee_amount: Decimal | None,
        name: str | None = None,
        fee_percent: Decimal | None = None,
        min_days_late: int | None = None,
        cooldown_hours: int,
        active: bool,
    ) -> PenaltyRule:
        """Insert a new penalty rule and flush to obtain a DB-assigned id."""
        rule = PenaltyRule(
            goddess_id=goddess_id,
            sub_id=sub_id,
            trigger=trigger,
            action=action,
            points_delta=points_delta,
            fee_amount=fee_amount,
            name=name,
            fee_percent=fee_percent,
            min_days_late=min_days_late,
            cooldown_hours=cooldown_hours,
            active=active,
        )
        self._session.add(rule)
        await self._session.flush()
        return rule

    async def update(self, rule: PenaltyRule, patch: dict[str, Any]) -> PenaltyRule:
        """Apply partial updates to a penalty rule and stamp updated_at."""
        for field, value in patch.items():
            setattr(rule, field, value)
        rule.updated_at = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        self._session.add(rule)
        await self._session.flush()
        return rule

    async def delete(self, rule: PenaltyRule) -> None:
        """Hard-delete a penalty rule row."""
        await self._session.delete(rule)
        await self._session.flush()

    async def find_matching_rule(
        self,
        goddess_id: UUID,
        sub_id: UUID,
        trigger: PenaltyTrigger,
        *,
        days_late: int | None = None,
    ) -> PenaltyRule | None:
        """Return the active rule that best matches the (goddess, sub, trigger) tuple.

        Resolution order: sub-specific first, then goddess-wide (sub_id NULL).
        Only rules with ``active=true`` are considered. Returns ``None`` when no
        active rule matches.

        For ``rolling_late`` triggers, ``days_late`` gates eligibility: a rule fires
        only when ``min_days_late IS NULL OR min_days_late <= days_late``. Among
        eligible rules the one with the highest ``min_days_late`` wins (most specific
        threshold). Sub-specific rules still take precedence over goddess-wide ones at
        the same specificity tier.
        """
        specific = await self._find_best(
            goddess_id, sub_id, trigger, days_late=days_late, sub_scoped=True
        )
        if specific is not None:
            return specific
        return await self._find_best(
            goddess_id, sub_id, trigger, days_late=days_late, sub_scoped=False
        )

    async def _find_best(
        self,
        goddess_id: UUID,
        sub_id: UUID,
        trigger: PenaltyTrigger,
        *,
        days_late: int | None,
        sub_scoped: bool,
    ) -> PenaltyRule | None:
        stmt = select(PenaltyRule).where(
            col(PenaltyRule.goddess_id) == goddess_id,
            col(PenaltyRule.trigger) == trigger,
            col(PenaltyRule.active).is_(True),
        )
        if sub_scoped:
            stmt = stmt.where(col(PenaltyRule.sub_id) == sub_id)
        else:
            stmt = stmt.where(col(PenaltyRule.sub_id).is_(None))

        # Gate on min_days_late when a days_late value is provided.
        if days_late is not None:
            from sqlalchemy import or_

            stmt = stmt.where(
                or_(
                    col(PenaltyRule.min_days_late).is_(None),
                    col(PenaltyRule.min_days_late) <= days_late,
                )
            )
            # Prefer the rule with the highest min_days_late (most specific threshold).
            stmt = stmt.order_by(col(PenaltyRule.min_days_late).desc().nulls_last())
        else:
            stmt = stmt.order_by(col(PenaltyRule.created_at).desc())

        result = await self._session.execute(stmt.limit(1))
        return result.scalar_one_or_none()

    async def fired_within_cooldown(
        self,
        *,
        rule_id: UUID,
        sub_id: UUID,
        source_kind: str,
        source_id: UUID | None,
        now: datetime.datetime,
        cooldown_hours: int,
    ) -> bool:
        """Return True if this (rule, sub, source_kind, source_id) tuple fired recently.

        "Recently" means within the cooldown window ending at ``now``. The caller
        supplies the cooldown in hours (from the rule) so the DAO stays purely
        query-scoped.
        """
        window_start = now - datetime.timedelta(hours=cooldown_hours)
        stmt = select(PenaltyEvent).where(
            col(PenaltyEvent.rule_id) == rule_id,
            col(PenaltyEvent.sub_id) == sub_id,
            col(PenaltyEvent.source_kind) == source_kind,
            col(PenaltyEvent.created_at) >= window_start,
        )
        if source_id is not None:
            stmt = stmt.where(col(PenaltyEvent.source_id) == source_id)
        else:
            stmt = stmt.where(col(PenaltyEvent.source_id).is_(None))
        stmt = stmt.limit(1)

        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def log_event(
        self,
        *,
        rule: PenaltyRule,
        sub_id: UUID,
        trigger: PenaltyTrigger,
        action: PenaltyAction,
        points_delta: int,
        source_kind: str,
        source_id: UUID | None,
    ) -> PenaltyEvent:
        """Persist a penalty_event row for the given fire and return it."""
        event = PenaltyEvent(
            rule_id=rule.id,
            sub_id=sub_id,
            goddess_id=rule.goddess_id,
            trigger=trigger,
            action=action,
            points_delta=points_delta,
            source_kind=source_kind,
            source_id=source_id,
        )
        self._session.add(event)
        await self._session.flush()
        return event
