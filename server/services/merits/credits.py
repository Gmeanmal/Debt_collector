"""Thin helpers that emit a MeritEvent in the same session/transaction as a status flip.

Each function delegates to MeritEventDao.insert_idempotent so duplicate calls
(e.g. cron retries) are silently swallowed via the partial unique index on
(source_kind, source_id).
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from daos.merit_event_dao import MeritEventDao
from models.merit_event import MeritEvent, MeritSourceKind
from models.ritual import Ritual
from models.ritual_occurrence import RitualOccurrence
from models.task import Task


async def record_ritual_complete(
    session: AsyncSession, occurrence: RitualOccurrence, ritual: Ritual
) -> bool:
    """Emit a ritual_complete credit for the given occurrence."""
    dao = MeritEventDao(session)
    event = MeritEvent(
        sub_id=occurrence.sub_id,
        goddess_id=occurrence.goddess_id,
        source_kind=MeritSourceKind.ritual_complete,
        source_id=occurrence.id,
        delta=ritual.points_on_complete,
    )
    return await dao.insert_idempotent(event)


async def record_ritual_miss(
    session: AsyncSession, occurrence: RitualOccurrence, ritual: Ritual
) -> bool:
    """Emit a ritual_miss debit for the given occurrence."""
    dao = MeritEventDao(session)
    event = MeritEvent(
        sub_id=occurrence.sub_id,
        goddess_id=occurrence.goddess_id,
        source_kind=MeritSourceKind.ritual_miss,
        source_id=occurrence.id,
        delta=ritual.points_on_miss,
    )
    return await dao.insert_idempotent(event)


async def record_task_complete(session: AsyncSession, task: Task) -> bool:
    """Emit a task_complete credit for the given task."""
    dao = MeritEventDao(session)
    event = MeritEvent(
        sub_id=task.sub_id,
        goddess_id=task.goddess_id,
        source_kind=MeritSourceKind.task_complete,
        source_id=task.id,
        delta=task.points_on_complete,
    )
    return await dao.insert_idempotent(event)


async def record_task_miss(session: AsyncSession, task: Task) -> bool:
    """Emit a task_miss debit for the given task."""
    dao = MeritEventDao(session)
    event = MeritEvent(
        sub_id=task.sub_id,
        goddess_id=task.goddess_id,
        source_kind=MeritSourceKind.task_miss,
        source_id=task.id,
        delta=task.points_on_miss,
    )
    return await dao.insert_idempotent(event)


async def record_ritual_miss_for_cron(
    session: AsyncSession,
    *,
    occurrence_id: UUID,
    sub_id: UUID,
    goddess_id: UUID,
    delta: int,
) -> bool:
    """Emit a ritual_miss event from cron context without loading full model objects.

    Accepts scalar values because the cron bulk-update does not have ORM objects
    in memory after a raw UPDATE statement.
    """
    dao = MeritEventDao(session)
    event = MeritEvent(
        sub_id=sub_id,
        goddess_id=goddess_id,
        source_kind=MeritSourceKind.ritual_miss,
        source_id=occurrence_id,
        delta=delta,
    )
    return await dao.insert_idempotent(event)
