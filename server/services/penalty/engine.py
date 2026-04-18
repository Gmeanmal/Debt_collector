"""Penalty engine consulted by cron jobs before applying default penalties.

Looks up the active ``penalty_rule`` for ``(goddess, sub, trigger)``, enforces
``cooldown_hours`` via ``penalty_event`` history, and emits the corresponding
merit debit for ``action=apply_points`` through the existing
``MeritEventDao.insert_idempotent`` SAVEPOINT path. Returns the delta actually
applied so callers can decide whether to also emit a default balance change.
"""

import datetime
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from daos.merit_event_dao import MeritEventDao
from daos.penalty_rule_dao import PenaltyRuleDao
from models.merit_event import MeritEvent, MeritSourceKind
from models.penalty_rule import PenaltyAction, PenaltyTrigger

log = structlog.get_logger()


_SOURCE_KIND_TO_MERIT: dict[str, MeritSourceKind] = {
    "ritual_miss": MeritSourceKind.ritual_miss,
    "task_miss": MeritSourceKind.task_miss,
    "contract_miss": MeritSourceKind.contract_miss,
    "rolling_late": MeritSourceKind.rolling_late,
}


def _merit_source_kind_for(source_kind: str) -> MeritSourceKind:
    try:
        return _SOURCE_KIND_TO_MERIT[source_kind]
    except KeyError as exc:  # pragma: no cover — guards callers of the engine
        raise ValueError(f"unsupported penalty source_kind: {source_kind!r}") from exc


async def apply_penalty(
    session: AsyncSession,
    *,
    goddess_id: UUID,
    sub_id: UUID,
    trigger: PenaltyTrigger,
    source_kind: str,
    source_id: UUID | None,
    default_delta: int,
    days_late: int | None = None,
) -> int:
    """Consult the penalty engine and apply the matching rule.

    Returns the merit delta actually applied to the sub's balance:

    - ``default_delta`` — when no active rule matches. A merit event with
      ``default_delta`` is emitted via ``MeritEventDao.insert_idempotent`` so
      callers do not need to duplicate the default credit path. Callers that
      pass ``default_delta=0`` (rolling late, contract missed) get the "only
      fire if a rule exists" behaviour for free.
    - ``0`` — when a rule matches but ``action='notify_only'`` **or** the
      cooldown window suppresses the fire.
    - ``rule.points_delta`` — when the rule fires with
      ``action='apply_points'`` and emits a merit event. If the merit insert
      is rejected by the ``(source_kind, source_id)`` partial unique index
      (duplicate within a single transaction), ``0`` is returned instead.

    ``action='apply_fee'`` is stored but not wired into any balance change yet
    and behaves like ``notify_only`` with respect to the merit ledger.
    """
    rule_dao = PenaltyRuleDao(session)
    # Pass days_late so rolling_late rules are gated by their min_days_late threshold.
    rule = await rule_dao.find_matching_rule(goddess_id, sub_id, trigger, days_late=days_late)

    if rule is None:
        if default_delta == 0:
            return 0
        await _emit_merit_event(
            session,
            goddess_id=goddess_id,
            sub_id=sub_id,
            source_kind=source_kind,
            source_id=source_id,
            delta=default_delta,
        )
        return default_delta

    now = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
    if await rule_dao.fired_within_cooldown(
        rule_id=rule.id,
        sub_id=sub_id,
        source_kind=source_kind,
        source_id=source_id,
        now=now,
        cooldown_hours=rule.cooldown_hours,
    ):
        log.info(
            "penalty_cooldown_suppressed",
            rule_id=str(rule.id),
            sub_id=str(sub_id),
            trigger=str(trigger),
            source_kind=source_kind,
            source_id=str(source_id) if source_id is not None else None,
        )
        return 0

    applied_delta = 0
    if rule.action == PenaltyAction.apply_points:
        inserted = await _emit_merit_event(
            session,
            goddess_id=goddess_id,
            sub_id=sub_id,
            source_kind=source_kind,
            source_id=source_id,
            delta=rule.points_delta,
        )
        applied_delta = rule.points_delta if inserted else 0

    await rule_dao.log_event(
        rule=rule,
        sub_id=sub_id,
        trigger=trigger,
        action=rule.action,
        points_delta=applied_delta,
        source_kind=source_kind,
        source_id=source_id,
    )

    log.info(
        "penalty_applied",
        rule_id=str(rule.id),
        sub_id=str(sub_id),
        trigger=str(trigger),
        action=str(rule.action),
        applied_delta=applied_delta,
        source_kind=source_kind,
        source_id=str(source_id) if source_id is not None else None,
    )
    return applied_delta


async def _emit_merit_event(
    session: AsyncSession,
    *,
    goddess_id: UUID,
    sub_id: UUID,
    source_kind: str,
    source_id: UUID | None,
    delta: int,
) -> bool:
    """Insert a merit_event wrapped in a SAVEPOINT; returns True on success."""
    merit_dao = MeritEventDao(session)
    event = MeritEvent(
        sub_id=sub_id,
        goddess_id=goddess_id,
        source_kind=_merit_source_kind_for(source_kind),
        source_id=source_id,
        delta=delta,
    )
    return await merit_dao.insert_idempotent(event)
