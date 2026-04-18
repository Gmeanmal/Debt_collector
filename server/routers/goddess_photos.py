from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.photo_controller import SubPhotoController
from core.db import get_session
from decorators.audit import audit
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.sub_photo import SubPhotoQueueOut, SubPhotoRejectIn, SubPhotoReviewOut, SubPhotoTopOut

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — caller is not a goddess or does not own this photo"}
_E404 = {"description": "Not found — photo does not exist"}

router = APIRouter(prefix="/goddess", tags=["goddess-photos"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> SubPhotoController:
    return SubPhotoController(session)


@router.get(
    "/photo-queue",
    summary="List pending sub photo submissions",
    description=(
        "Returns up to ``limit`` pending photo submissions across all subs belonging to the "
        "authenticated goddess, ordered newest-first. "
        "Each entry carries a presigned GET URL valid for 10 minutes so thumbnails can be "
        "displayed directly. "
        "Use the ``before`` cursor (an ISO-8601 UTC datetime) to fetch the next page: pass "
        "the ``uploaded_at`` of the last item in the previous response."
    ),
    response_model=list[SubPhotoQueueOut],
    status_code=200,
    tags=["goddess-photos"],
    responses={401: _E401, 403: _E403},
)
async def list_photo_queue(
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
        description="Maximum number of entries to return.",
    ),
    before: datetime | None = Query(
        default=None,
        description=(
            "Cursor for pagination. Pass the ``uploaded_at`` of the last item from "
            "the previous page to fetch the next batch."
        ),
    ),
    caller: User = Depends(require_role(UserRole.goddess)),
    ctrl: SubPhotoController = Depends(_ctrl),
) -> list[SubPhotoQueueOut]:
    """Return the pending photo review queue for the authenticated goddess."""
    return await ctrl.list_pending_queue(caller=caller, limit=limit, before=before)


@router.get(
    "/subs/{sub_id}/photos/top",
    summary="Get the top approved photo for a sub",
    description=(
        "Returns the most recently approved profile photo for the given sub, "
        "together with a presigned GET URL valid for 10 minutes. "
        "The sub must belong to the authenticated goddess. "
        "Returns 204 (no content) when the sub has no approved photos."
    ),
    response_model=SubPhotoTopOut | None,
    status_code=200,
    tags=["goddess-photos"],
    responses={
        204: {"description": "No approved photo exists for this sub"},
        401: _E401,
        403: _E403,
        404: _E404,
    },
)
async def get_top_approved_photo(
    sub_id: UUID,
    caller: User = Depends(require_role(UserRole.goddess)),
    ctrl: SubPhotoController = Depends(_ctrl),
) -> SubPhotoTopOut | None:
    """Return the top approved photo for the given sub."""
    return await ctrl.top_approved_photo(sub_id=sub_id, goddess_user_id=caller.id)


@router.post(
    "/photos/{photo_id}/approve",
    summary="Approve a sub photo submission",
    description=(
        "Marks the photo as approved, stamps ``reviewed_at`` and ``reviewed_by``, and "
        "returns the updated review record with a fresh presigned URL valid for 10 minutes. "
        "Idempotent: if the photo is already approved the response is returned unchanged. "
        "The photo must belong to a sub linked to the authenticated goddess."
    ),
    response_model=SubPhotoReviewOut,
    status_code=200,
    tags=["goddess-photos"],
    responses={401: _E401, 403: _E403, 404: _E404},
)
@audit(kind="photo_approved", entity="sub_photo")
async def approve_photo(
    photo_id: UUID,
    session: AsyncSession = Depends(get_session),
    caller: User = Depends(require_role(UserRole.goddess)),
    ctrl: SubPhotoController = Depends(_ctrl),
) -> SubPhotoReviewOut:
    """Approve a pending sub photo as the authenticated goddess."""
    photo, _url = await ctrl.approve_photo(photo_id=photo_id, caller=caller)
    await session.commit()
    return SubPhotoReviewOut(
        id=photo.id,
        status=photo.status,
        reviewed_at=photo.reviewed_at,
        rejection_reason=photo.rejection_reason,
    )


@router.post(
    "/photos/{photo_id}/reject",
    summary="Reject a sub photo submission",
    description=(
        "Marks the photo as rejected and stores the goddess-supplied reason. "
        "The object-store key is **not** deleted — a 30-day GC job handles purging. "
        "Idempotent: if the photo is already rejected the response is returned unchanged. "
        "The photo must belong to a sub linked to the authenticated goddess."
    ),
    response_model=SubPhotoReviewOut,
    status_code=200,
    tags=["goddess-photos"],
    responses={401: _E401, 403: _E403, 404: _E404},
)
@audit(kind="photo_rejected", entity="sub_photo")
async def reject_photo(
    photo_id: UUID,
    body: SubPhotoRejectIn,
    session: AsyncSession = Depends(get_session),
    caller: User = Depends(require_role(UserRole.goddess)),
    ctrl: SubPhotoController = Depends(_ctrl),
) -> SubPhotoReviewOut:
    """Reject a pending sub photo as the authenticated goddess."""
    photo = await ctrl.reject_photo(photo_id=photo_id, caller=caller, reason=body.reason)
    await session.commit()
    return SubPhotoReviewOut(
        id=photo.id,
        status=photo.status,
        reviewed_at=photo.reviewed_at,
        rejection_reason=photo.rejection_reason,
    )
