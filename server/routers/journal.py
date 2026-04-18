from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.journal_controller import JournalController
from core.db import get_session
from decorators.audit import audit
from dependencies.auth import require_role
from models.journal_entry import JournalMood
from models.user import User, UserRole
from schemas.journal import JournalCommentIn, JournalEntryIn, JournalEntryOut

_ERROR_400 = {"description": "Bad request — caller is not in a state that allows this action"}
_ERROR_401 = {"description": "Unauthorized — missing or invalid access token"}
_ERROR_403 = {
    "description": "Forbidden — caller lacks the required role or the entry is not theirs",
}
_ERROR_404 = {"description": "Not found — journal entry or sub does not exist for this caller"}
_ERROR_413 = {"description": "Payload Too Large — attachment exceeds 10 MB"}
_ERROR_422 = {"description": "Unprocessable entity — request body validation failed"}
_ERROR_500 = {"description": "Internal server error"}

router = APIRouter(tags=["journal"])


def _build_controller(session: AsyncSession = Depends(get_session)) -> JournalController:
    return JournalController(session)


@router.post(
    "/sub/journal",
    summary="Create a journal entry",
    description=(
        "Persists a new journal entry authored by the authenticated sub. "
        "Accepts multipart/form-data so an optional attachment (image or audio, ≤ 10 MB) "
        "can be uploaded in the same request. "
        "When `is_private` is true the entry is hidden from the goddess. "
        "No notification is emitted for private entries. "
        "Entries are immutable after creation — there is no edit or delete path for the body. "
        "The goddess assignment is resolved server-side from the sub's profile."
    ),
    response_model=JournalEntryOut,
    status_code=201,
    tags=["journal"],
    responses={
        400: _ERROR_400,
        401: _ERROR_401,
        403: _ERROR_403,
        413: _ERROR_413,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def create_journal_entry(
    body: str = Form(..., description="Free-form journal body. Immutable once submitted."),
    mood: JournalMood = Form(..., description="Mood tag selected at time of writing."),
    is_private: bool = Form(
        default=False,
        description="When true the entry is hidden from the goddess.",
    ),
    photo_r2_key: str | None = Form(
        default=None,
        description="Deprecated — use the attachment file field instead.",
    ),
    attachment: UploadFile | None = File(
        default=None,
        description=(
            "Optional attachment: image/jpeg, image/png, image/webp, "
            "audio/mpeg, audio/ogg, audio/webm. Max 10 MB."
        ),
    ),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: JournalController = Depends(_build_controller),
) -> JournalEntryOut:
    payload = JournalEntryIn(body=body, mood=mood, is_private=is_private, photo_r2_key=photo_r2_key)
    attachment_data: bytes | None = None
    attachment_mime: str | None = None
    if attachment is not None and attachment.size and attachment.size > 0:
        attachment_data = await attachment.read()
        attachment_mime = attachment.content_type
    result = await ctrl.create_entry(user, payload, attachment_data, attachment_mime)
    await session.commit()
    return result


@router.get(
    "/sub/journal",
    summary="List own journal entries",
    description=(
        "Returns the authenticated sub's entries (including private ones), newest first. "
        "Cursor-paginated via `before` (an ISO-8601 `created_at`); "
        "pass the `created_at` of the oldest row of the previous page to fetch the next one."
    ),
    response_model=list[JournalEntryOut],
    status_code=200,
    tags=["journal"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def list_own_journal(
    limit: int = Query(default=20, ge=1, le=100, description="Max entries to return."),
    before: datetime | None = Query(
        default=None,
        description="Cursor: return only entries strictly older than this `created_at`.",
    ),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: JournalController = Depends(_build_controller),
) -> list[JournalEntryOut]:
    return await ctrl.list_self(user, limit, before)


@router.get(
    "/goddess/subs/{sub_id}/journal",
    summary="List a sub's journal entries for the goddess",
    description=(
        "Returns non-private entries for the given sub, newest first, "
        "cursor-paginated via `before`. "
        "As a side-effect, every still-unread entry for this goddess+sub pair is stamped "
        "`read_by_goddess_at = now()` atomically with the read. "
        "Private entries (`is_private = true`) are always excluded. "
        "Requests for subs under a different goddess are rejected with 403."
    ),
    response_model=list[JournalEntryOut],
    status_code=200,
    tags=["journal"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def list_sub_journal_for_goddess(
    sub_id: UUID,
    limit: int = Query(default=20, ge=1, le=100, description="Max entries to return."),
    before: datetime | None = Query(
        default=None,
        description="Cursor: return only entries strictly older than this `created_at`.",
    ),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: JournalController = Depends(_build_controller),
) -> list[JournalEntryOut]:
    result = await ctrl.list_for_goddess(user, sub_id, limit, before)
    await session.commit()
    return result


@router.post(
    "/goddess/subs/{username}/journal/{entry_id}/read",
    summary="Mark a journal entry as read",
    description=(
        "Explicitly marks a single journal entry as read by the goddess. "
        "Idempotent — if `read_by_goddess_at` is already set the earlier timestamp is preserved. "
        "Returns 404 if the entry does not exist or does not belong to a sub of this goddess."
    ),
    response_model=JournalEntryOut,
    status_code=200,
    tags=["journal"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def mark_journal_entry_read(
    username: str,
    entry_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: JournalController = Depends(_build_controller),
) -> JournalEntryOut:
    result = await ctrl.mark_read(user, username, entry_id)
    await session.commit()
    return result


@router.patch(
    "/goddess/journal/{entry_id}/comment",
    summary="Upsert the goddess comment on an entry",
    description=(
        "Replaces the goddess comment on the given journal entry and stamps `goddess_comment_at`. "
        "Triggers a `journal_comment` notification to the sub. "
        "Rejected with 403 if the entry belongs to a different goddess."
    ),
    response_model=JournalEntryOut,
    status_code=200,
    tags=["journal"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
@audit(kind="journal_commented", entity="journal_entry")
async def upsert_journal_comment(
    entry_id: UUID,
    body: JournalCommentIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: JournalController = Depends(_build_controller),
) -> JournalEntryOut:
    result = await ctrl.set_comment(user, entry_id, body.comment)
    await session.commit()
    return result
