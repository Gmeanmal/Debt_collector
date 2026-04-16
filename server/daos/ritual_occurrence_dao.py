import datetime
from uuid import UUID

from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import NotFound
from models.ritual import Ritual
from models.ritual_occurrence import OccurrenceStatus, RitualOccurrence


class RitualOccurrenceDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_ritual_and_date(
        self, ritual_id: UUID, date: datetime.date
    ) -> RitualOccurrence:
        """Return the occurrence for a given ritual on a given date, raising NotFound if absent."""
        result = await self._session.execute(
            select(RitualOccurrence).where(
                col(RitualOccurrence.ritual_id) == ritual_id,
                col(RitualOccurrence.date) == date,
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise NotFound(f"ritual_occurrence for ritual {ritual_id} on {date} not found")
        return row

    async def bulk_create_for_date(self, rows: list[dict[str, object]]) -> int:
        """Insert many occurrences for a single calendar date in one statement.

        Uses ON CONFLICT DO NOTHING on (ritual_id, date) so the operation is
        idempotent — re-running the cron for the same day is a no-op.
        Returns the number of rows actually inserted.
        """
        if not rows:
            return 0
        stmt = (
            insert(RitualOccurrence)
            .values(rows)
            .on_conflict_do_nothing(
                index_elements=["ritual_id", "date"],
            )
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.rowcount  # type: ignore[return-value]

    async def list_today_for_sub(self, sub_id: UUID, date: datetime.date) -> list[RitualOccurrence]:
        """Return all occurrences for a sub on a given calendar date, ordered by created_at."""
        result = await self._session.execute(
            select(RitualOccurrence)
            .where(
                col(RitualOccurrence.sub_id) == sub_id,
                col(RitualOccurrence.date) == date,
            )
            .order_by(col(RitualOccurrence.created_at).asc())
        )
        return list(result.scalars().all())

    async def list_pending_for_date_with_points(
        self, date: datetime.date
    ) -> list[tuple[UUID, UUID, UUID, int]]:
        """Return (occurrence_id, sub_id, goddess_id, points_on_miss) for pending occurrences.

        Used by the cron mark-missed pass so merit events can be emitted before the
        bulk UPDATE removes the pending status. Only rows still in ``pending`` are returned.
        """
        result = await self._session.execute(
            select(
                col(RitualOccurrence.id),
                col(RitualOccurrence.sub_id),
                col(RitualOccurrence.goddess_id),
                col(Ritual.points_on_miss),
            )
            .join(Ritual, col(RitualOccurrence.ritual_id) == col(Ritual.id))
            .where(
                col(RitualOccurrence.date) == date,
                col(RitualOccurrence.status) == OccurrenceStatus.pending,
            )
        )
        return [(row[0], row[1], row[2], row[3]) for row in result.all()]

    async def mark_completed(
        self,
        occurrence_id: UUID,
        *,
        completed_at: datetime.datetime,
        note: str | None = None,
        evidence_r2_key: str | None = None,
        evidence_photo_id: UUID | None = None,
    ) -> RitualOccurrence:
        """Transition a pending occurrence to completed."""
        occ = await self._get_by_id(occurrence_id)
        occ.status = OccurrenceStatus.completed
        occ.completed_at = completed_at
        if note is not None:
            occ.note = note
        if evidence_r2_key is not None:
            occ.evidence_r2_key = evidence_r2_key
        if evidence_photo_id is not None:
            occ.evidence_photo_id = evidence_photo_id
        self._session.add(occ)
        await self._session.flush()
        return occ

    async def mark_missed_bulk(self, occurrence_ids: list[UUID]) -> int:
        """Flip a batch of pending occurrences to missed in a single UPDATE.

        Returns the number of rows affected.
        """
        if not occurrence_ids:
            return 0
        stmt = (
            update(RitualOccurrence)
            .where(
                col(RitualOccurrence.id).in_(occurrence_ids),
                col(RitualOccurrence.status) == OccurrenceStatus.pending,
            )
            .values(status=OccurrenceStatus.missed)
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.rowcount  # type: ignore[return-value]

    async def mark_missed_by_date(self, date: datetime.date) -> int:
        """Flip every still-pending occurrence on ``date`` to missed in a single UPDATE.

        Naturally idempotent: the second run finds no rows in ``pending`` and returns 0.
        Returns the number of rows affected.
        """
        stmt = (
            update(RitualOccurrence)
            .where(
                col(RitualOccurrence.date) == date,
                col(RitualOccurrence.status) == OccurrenceStatus.pending,
            )
            .values(status=OccurrenceStatus.missed)
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.rowcount  # type: ignore[return-value]

    async def mark_submitted(
        self,
        occurrence_id: UUID,
        *,
        note: str | None = None,
        evidence_r2_key: str | None = None,
        evidence_photo_id: UUID | None = None,
    ) -> RitualOccurrence:
        """Transition a pending occurrence to submitted (sub has uploaded evidence)."""
        occ = await self._get_by_id(occurrence_id)
        occ.status = OccurrenceStatus.submitted
        if note is not None:
            occ.note = note
        if evidence_r2_key is not None:
            occ.evidence_r2_key = evidence_r2_key
        if evidence_photo_id is not None:
            occ.evidence_photo_id = evidence_photo_id
        self._session.add(occ)
        await self._session.flush()
        return occ

    async def mark_reviewed(
        self,
        occurrence_id: UUID,
        *,
        status: OccurrenceStatus,
        reviewer_id: UUID,
    ) -> RitualOccurrence:
        """Apply a goddess review decision (completed or rejected) to an occurrence."""
        occ = await self._get_by_id(occurrence_id)
        occ.status = status
        occ.reviewed_at = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        occ.reviewed_by = reviewer_id
        self._session.add(occ)
        await self._session.flush()
        return occ

    async def get_by_id(self, occurrence_id: UUID) -> RitualOccurrence:
        """Return an occurrence by id, raising NotFound if absent."""
        return await self._get_by_id(occurrence_id)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _get_by_id(self, occurrence_id: UUID) -> RitualOccurrence:
        row = await self._session.get(RitualOccurrence, occurrence_id)
        if row is None:
            raise NotFound(f"ritual_occurrence {occurrence_id} not found")
        return row
