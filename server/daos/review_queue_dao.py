import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.ritual import Ritual
from models.ritual_occurrence import OccurrenceStatus, RitualOccurrence
from models.task import Task, TaskStatus
from models.user import User


class ReviewQueueDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_submitted_occurrences_for_goddess(
        self,
        goddess_id: UUID,
        *,
        before: datetime.datetime | None = None,
        limit: int = 50,
    ) -> list[tuple[RitualOccurrence, Ritual, User]]:
        """Return submitted occurrences for the goddess's subs, newest-first.

        Joins Ritual (for title + points_on_complete) and User (for sub identity).
        Applies an optional cursor on completed_at for pagination.
        """
        stmt = (
            select(RitualOccurrence, Ritual, User)
            .join(Ritual, col(RitualOccurrence.ritual_id) == col(Ritual.id))
            .join(User, col(RitualOccurrence.sub_id) == col(User.id))
            .where(
                col(RitualOccurrence.goddess_id) == goddess_id,
                col(RitualOccurrence.status) == OccurrenceStatus.submitted,
            )
        )
        if before is not None:
            stmt = stmt.where(col(RitualOccurrence.completed_at) < before)
        stmt = stmt.order_by(
            col(RitualOccurrence.completed_at).desc(),
            col(RitualOccurrence.id).desc(),
        ).limit(limit)
        result = await self._session.execute(stmt)
        return [(occ, ritual, user) for occ, ritual, user in result.all()]

    async def list_submitted_tasks_for_goddess(
        self,
        goddess_id: UUID,
        *,
        before: datetime.datetime | None = None,
        limit: int = 50,
    ) -> list[tuple[Task, User]]:
        """Return submitted tasks for the goddess, newest-first.

        Joins User for sub identity. Applies an optional cursor on submitted_at.
        """
        stmt = (
            select(Task, User)
            .join(User, col(Task.sub_id) == col(User.id))
            .where(
                col(Task.goddess_id) == goddess_id,
                col(Task.status) == TaskStatus.submitted,
            )
        )
        if before is not None:
            stmt = stmt.where(col(Task.submitted_at) < before)
        stmt = stmt.order_by(
            col(Task.submitted_at).desc(),
            col(Task.id).desc(),
        ).limit(limit)
        result = await self._session.execute(stmt)
        return [(task, user) for task, user in result.all()]
