from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.journal_controller import JournalController
from core.db import get_session
from decorators.audit import audit
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.journal import JournalCommentIn, JournalEntryIn, JournalEntryOut

_ERROR_400 = {"description": "Bad request — caller is not in a state that allows this action"}
_ERROR_401 = {"description": "Unauthorized — missing or invalid access token"}
_ERROR_403 = {
    "description": "Forbidden — caller lacks the required role or the entry is not theirs",
}
_ERROR_404 = {"description": "Not found — journal entry or sub does not exist for this caller"}
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
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def create_journal_entry(
    body: JournalEntryIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: JournalController = Depends(_build_controller),
) -> JournalEntryOut:
    result = await ctrl.create_entry(user, body)
    await session.commit()
    return result


@router.get(
    "/sub/journal",
    summary="List own journal entries",
    description=(
        "Returns the authenticated sub's entries, newest first. "
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
        "Returns entries for the given sub, newest first, cursor-paginated via `before`. "
        "As a side-effect, every still-unread entry for this goddess+sub pair is stamped "
        "`read_by_goddess_at = now()` atomically with the read. "
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
