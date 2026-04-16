import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.review_queue_controller import ReviewQueueController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.review_queue import BulkActionIn, BulkActionOut, ReviewQueueItemOut

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}

router = APIRouter(prefix="/goddess/review-queue", tags=["review-queue"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> ReviewQueueController:
    return ReviewQueueController(session)


@router.get(
    "",
    summary="List cross-sub review queue",
    description=(
        "Returns a merged, newest-first list of all `submitted` ritual occurrences "
        "and tasks belonging to the authenticated goddess's subs. "
        "Use the `before` cursor (ISO 8601 datetime) to paginate. "
        "Evidence presigned URLs are generated inline with a 10-minute TTL."
    ),
    response_model=list[ReviewQueueItemOut],
    status_code=200,
    tags=["review-queue"],
    responses={401: _E401, 403: _E403},
)
async def get_review_queue(
    limit: Annotated[
        int,
        Query(ge=1, le=200, description="Maximum number of items to return"),
    ] = 50,
    before: Annotated[
        datetime.datetime | None,
        Query(description="ISO 8601 cursor — return items submitted before this timestamp"),
    ] = None,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: ReviewQueueController = Depends(_ctrl),
) -> list[ReviewQueueItemOut]:
    return await ctrl.list_review_queue(user, limit=limit, before=before)


@router.post(
    "/bulk",
    summary="Bulk approve or reject queue items",
    description=(
        "Approve or reject multiple ritual occurrences and/or tasks in a single call. "
        "Partial success is allowed — failed items do not roll back already-approved ones. "
        "`reason` is required when `action=reject` and is stored on each rejected item. "
        "Returns a `succeeded` list and a `failed` list with per-item error messages."
    ),
    response_model=BulkActionOut,
    status_code=200,
    tags=["review-queue"],
    responses={401: _E401, 403: _E403, 422: _E422},
)
async def bulk_action(
    body: BulkActionIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: ReviewQueueController = Depends(_ctrl),
) -> BulkActionOut:
    result = await ctrl.bulk_action(user, body)
    await session.commit()
    return result
