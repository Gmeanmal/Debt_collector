from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from core.exceptions import Forbidden, NotFound
from models.journal_entry import JournalEntry, JournalMood


class JournalDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_entry(
        self,
        *,
        sub_id: UUID,
        goddess_id: UUID,
        body: str,
        mood: JournalMood,
        photo_r2_key: str | None = None,
    ) -> JournalEntry:
        """Insert a new journal entry and return it."""
        entry = JournalEntry(
            sub_id=sub_id,
            goddess_id=goddess_id,
            body=body,
            mood=mood,
            photo_r2_key=photo_r2_key,
        )
        self._session.add(entry)
        return entry

    async def list_for_sub(
        self,
        sub_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[JournalEntry]:
        """Return all journal entries for the given sub, newest first."""
        result = await self._session.execute(
            select(JournalEntry)
            .where(col(JournalEntry.sub_id) == sub_id)
            .order_by(col(JournalEntry.created_at).desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def list_for_goddess_sub(
        self,
        goddess_id: UUID,
        sub_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[JournalEntry]:
        """Return journal entries for a specific sub visible to the given goddess."""
        result = await self._session.execute(
            select(JournalEntry)
            .where(
                col(JournalEntry.goddess_id) == goddess_id,
                col(JournalEntry.sub_id) == sub_id,
            )
            .order_by(col(JournalEntry.created_at).desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def list_for_sub_cursor(
        self,
        sub_id: UUID,
        limit: int,
        before: datetime | None,
    ) -> list[JournalEntry]:
        """Return entries for a sub, newest-first, created before `before` if given."""
        stmt = select(JournalEntry).where(col(JournalEntry.sub_id) == sub_id)
        if before is not None:
            stmt = stmt.where(col(JournalEntry.created_at) < before)
        stmt = stmt.order_by(col(JournalEntry.created_at).desc()).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_goddess_sub_and_mark_read(
        self,
        goddess_id: UUID,
        sub_id: UUID,
        limit: int,
        before: datetime | None,
    ) -> list[JournalEntry]:
        """Return entries for a goddess+sub pair and mark unread ones read in one unit of work.

        The bulk UPDATE and the SELECT run in the same DB transaction, so the caller observes
        either both or neither once `session.commit()` fires at the router boundary.
        """
        now = datetime.now(UTC).replace(tzinfo=None)
        await self._session.execute(
            update(JournalEntry)
            .where(
                col(JournalEntry.goddess_id) == goddess_id,
                col(JournalEntry.sub_id) == sub_id,
                col(JournalEntry.read_by_goddess_at).is_(None),
            )
            .values(read_by_goddess_at=now)
        )
        stmt = select(JournalEntry).where(
            col(JournalEntry.goddess_id) == goddess_id,
            col(JournalEntry.sub_id) == sub_id,
        )
        if before is not None:
            stmt = stmt.where(col(JournalEntry.created_at) < before)
        stmt = stmt.order_by(col(JournalEntry.created_at).desc()).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def mark_read(self, entry_id: UUID, goddess_id: UUID) -> JournalEntry:
        """Set read_by_goddess_at to now if not already set. Idempotent."""
        entry = await self._get(entry_id)
        if entry.goddess_id != goddess_id:
            raise Forbidden(f"journal_entry {entry_id} does not belong to goddess {goddess_id}")
        if entry.read_by_goddess_at is None:
            entry.read_by_goddess_at = datetime.now(UTC).replace(tzinfo=None)
            self._session.add(entry)
        return entry

    async def set_comment(
        self,
        entry_id: UUID,
        goddess_id: UUID,
        comment: str | None,
    ) -> JournalEntry:
        """Update goddess_comment and goddess_comment_at. Passing None clears both."""
        entry = await self._get(entry_id)
        if entry.goddess_id != goddess_id:
            raise Forbidden(f"journal_entry {entry_id} does not belong to goddess {goddess_id}")
        if comment is None:
            entry.goddess_comment = None
            entry.goddess_comment_at = None
        else:
            entry.goddess_comment = comment
            entry.goddess_comment_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(entry)
        return entry

    async def _get(self, entry_id: UUID) -> JournalEntry:
        row = await self._session.get(JournalEntry, entry_id)
        if row is None:
            raise NotFound(f"journal_entry {entry_id} not found")
        return row
