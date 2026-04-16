from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from core.exceptions import BadRequest, Forbidden, NotFound
from daos.journal_dao import JournalDao
from daos.user_dao import UserDao
from models.notification import NotificationType
from models.user import User
from schemas.journal import JournalEntryIn, JournalEntryOut
from services.notifications.notify import notify


def _to_out(entry: object) -> JournalEntryOut:
    return JournalEntryOut.model_validate(entry)


class JournalController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = JournalDao(session)
        self._user_dao = UserDao(session)

    async def create_entry(self, sub_user: User, payload: JournalEntryIn) -> JournalEntryOut:
        """Persist a new journal entry authored by the sub."""
        if sub_user.goddess_id is None:
            raise BadRequest("sub is not assigned to a goddess")
        entry = await self._dao.create_entry(
            sub_id=sub_user.id,
            goddess_id=sub_user.goddess_id,
            body=payload.body,
            mood=payload.mood,
            photo_r2_key=payload.photo_r2_key,
        )
        await self._session.flush()
        return _to_out(entry)

    async def list_self(
        self,
        sub_user: User,
        limit: int,
        before: datetime | None,
    ) -> list[JournalEntryOut]:
        """Return the authenticated sub's own entries, newest first, cursor-paginated."""
        entries = await self._dao.list_for_sub_cursor(sub_user.id, limit, before)
        return [_to_out(e) for e in entries]

    async def list_for_goddess(
        self,
        goddess_user: User,
        sub_id: UUID,
        limit: int,
        before: datetime | None,
    ) -> list[JournalEntryOut]:
        """Return a sub's entries for the goddess, marking unread ones as read atomically."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        sub = await self._user_dao.get_by_id(sub_id)
        if sub is None:
            raise NotFound("sub not found")
        if sub.goddess_id != goddess_id:
            raise Forbidden("sub does not belong to this goddess")
        entries = await self._dao.list_for_goddess_sub_and_mark_read(
            goddess_id=goddess_id,
            sub_id=sub_id,
            limit=limit,
            before=before,
        )
        return [_to_out(e) for e in entries]

    async def set_comment(
        self,
        goddess_user: User,
        entry_id: UUID,
        comment: str,
    ) -> JournalEntryOut:
        """Upsert the goddess comment on an entry and notify the sub."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        entry = await self._dao.set_comment(entry_id, goddess_id, comment)
        await self._session.flush()
        await notify(
            self._session,
            entry.sub_id,
            NotificationType.journal_comment,
            title="New journal comment",
            body="Your goddess commented on a journal entry.",
            link="/sub/journal",
            payload={"entry_id": str(entry.id)},
        )
        return _to_out(entry)
