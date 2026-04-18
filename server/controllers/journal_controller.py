from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from core.config import get_settings
from core.exceptions import BadRequest, Forbidden, NotFound
from daos.journal_dao import JournalDao
from daos.user_dao import UserDao
from models.journal_entry import JournalEntry
from models.notification import NotificationType
from models.user import User
from schemas.journal import (
    ALLOWED_ATTACHMENT_MIMES,
    MAX_ATTACHMENT_BYTES,
    JournalEntryIn,
    JournalEntryOut,
)
from services.notifications.notify import notify
from services.storage.object_store import generate_presigned_url, upload_object


def _attachment_key_from_entry(entry: JournalEntry) -> str | None:
    """Return the effective storage key: attachment_key takes priority over photo_r2_key."""
    return entry.attachment_key or entry.photo_r2_key


async def _build_out(entry: JournalEntry) -> JournalEntryOut:
    """Build a JournalEntryOut, resolving the attachment presigned URL when a key exists."""
    key = _attachment_key_from_entry(entry)
    presigned: str | None = None
    if key:
        settings = get_settings()
        presigned = await generate_presigned_url(
            settings.s3_bucket_journal_attachments,
            key,
            ttl_seconds=settings.r2_presign_ttl_seconds,
        )
    out = JournalEntryOut.model_validate(entry)
    out.attachment_presigned_url = presigned
    # Never expose raw attachment_key to callers — clear it from the response.
    out.attachment_key = None
    out.photo_r2_key = None
    return out


class JournalController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = JournalDao(session)
        self._user_dao = UserDao(session)

    async def create_entry(
        self,
        sub_user: User,
        payload: JournalEntryIn,
        attachment_data: bytes | None = None,
        attachment_mime: str | None = None,
    ) -> JournalEntryOut:
        """Persist a new journal entry, optionally uploading an attachment."""
        if sub_user.goddess_id is None:
            raise BadRequest("sub is not assigned to a goddess")

        stored_key: str | None = None
        stored_mime: str | None = None
        # photo_r2_key written for image attachments for backwards-compat.
        photo_r2_key: str | None = None

        if attachment_data is not None and attachment_mime is not None:
            if attachment_mime not in ALLOWED_ATTACHMENT_MIMES:
                raise BadRequest(f"attachment mime '{attachment_mime}' is not allowed")
            if len(attachment_data) > MAX_ATTACHMENT_BYTES:
                raise BadRequest("attachment exceeds 10 MB limit")
            ext = attachment_mime.split("/")[-1].replace("mpeg", "mp3")
            stored_key = f"journal/{sub_user.id}/{uuid4()}.{ext}"
            stored_mime = attachment_mime
            settings = get_settings()
            await upload_object(
                settings.s3_bucket_journal_attachments,
                stored_key,
                attachment_data,
                attachment_mime,
            )
            if attachment_mime.startswith("image/"):
                photo_r2_key = stored_key

        # Fall back to legacy photo_r2_key from the payload when no multipart attachment provided.
        if stored_key is None and payload.photo_r2_key:
            photo_r2_key = payload.photo_r2_key

        entry = await self._dao.create_entry(
            sub_id=sub_user.id,
            goddess_id=sub_user.goddess_id,
            body=payload.body,
            mood=payload.mood,
            is_private=payload.is_private,
            photo_r2_key=photo_r2_key,
            attachment_key=stored_key,
            attachment_mime=stored_mime,
        )
        await self._session.flush()
        return await _build_out(entry)

    async def list_self(
        self,
        sub_user: User,
        limit: int,
        before: datetime | None,
    ) -> list[JournalEntryOut]:
        """Return the authenticated sub's own entries, newest first, cursor-paginated."""
        entries = await self._dao.list_for_sub_cursor(sub_user.id, limit, before)
        return [await _build_out(e) for e in entries]

    async def list_for_goddess(
        self,
        goddess_user: User,
        sub_id: UUID,
        limit: int,
        before: datetime | None,
    ) -> list[JournalEntryOut]:
        """Return a sub's non-private entries for the goddess, marking unread ones as read."""
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
        return [await _build_out(e) for e in entries]

    async def mark_read(
        self,
        goddess_user: User,
        sub_username: str,
        entry_id: UUID,
    ) -> JournalEntryOut:
        """Mark a single journal entry as read by the goddess. Idempotent."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        sub = await self._user_dao.get_by_username(sub_username)
        if sub is None:
            raise NotFound("sub not found")
        if sub.goddess_id != goddess_id:
            raise NotFound("sub does not belong to this goddess")
        entry = await self._dao.mark_read_if_unset(entry_id, goddess_id)
        await self._session.flush()
        return await _build_out(entry)

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
        return await _build_out(entry)
