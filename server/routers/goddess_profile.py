from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.profile_controller import ProfileController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.auth import UserOut
from schemas.profile import (
    GoddessEditSubProfileIn,
    GoddessRejectIn,
    GoddessSetFeeIn,
    ProfileChangeRequestOut,
)

_E400 = {"description": "Bad request — validation failed or no fields provided"}
_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — caller is not a goddess or does not own this resource"}
_E404 = {"description": "Not found — request or sub not found"}
_E409 = {"description": "Conflict — request is not in an actionable state"}

router = APIRouter(prefix="/goddess", tags=["profile"])


def _user_out(user: User) -> UserOut:
    parts = [p for p in [user.first_name, user.last_name] if p]
    display = " ".join(parts) if parts else user.username
    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        status=user.status,
        display_name=display,
        first_name=user.first_name,
        last_name=user.last_name,
        bio=user.bio,
        avatar_key=user.avatar_key,
        payment_handle=user.payment_handle,
        theme_preference=user.theme_preference,
        created_at=user.created_at,
        impersonator_id=None,
        impersonator_display_name=None,
    )


@router.get(
    "/profile/change-requests",
    summary="List pending profile change requests",
    description=(
        "Returns all pending profile change requests from subs belonging to the calling goddess, "
        "oldest first."
    ),
    response_model=list[ProfileChangeRequestOut],
    status_code=200,
    responses={401: _E401, 403: _E403},
)
async def list_pending_requests(
    goddess: User = Depends(require_role(UserRole.goddess)),
    session: AsyncSession = Depends(get_session),
) -> list[ProfileChangeRequestOut]:
    """List pending change requests for the goddess's subs."""
    ctrl = ProfileController(session)
    return await ctrl.list_pending_for_goddess(goddess)


@router.post(
    "/profile/change-requests/{request_id}/approve",
    summary="Approve a profile change request (no fee)",
    description=(
        "Goddess approves the change request without charging a fee. "
        "The profile diff is applied immediately to the sub's user row."
    ),
    response_model=ProfileChangeRequestOut,
    status_code=200,
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409},
)
async def approve_request(
    request_id: UUID,
    goddess: User = Depends(require_role(UserRole.goddess)),
    session: AsyncSession = Depends(get_session),
) -> ProfileChangeRequestOut:
    """Approve a change request free of charge."""
    ctrl = ProfileController(session)
    result = await ctrl.approve_free(request_id, goddess)
    await session.commit()
    return result


@router.post(
    "/profile/change-requests/{request_id}/reject",
    summary="Reject a profile change request",
    description=(
        "Goddess rejects a pending or awaiting-fee profile change request. "
        "An optional note is stored and visible to the sub."
    ),
    response_model=ProfileChangeRequestOut,
    status_code=200,
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409},
)
async def reject_request(
    request_id: UUID,
    body: GoddessRejectIn,
    goddess: User = Depends(require_role(UserRole.goddess)),
    session: AsyncSession = Depends(get_session),
) -> ProfileChangeRequestOut:
    """Reject a profile change request with an optional reason."""
    ctrl = ProfileController(session)
    result = await ctrl.reject(request_id, goddess, body)
    await session.commit()
    return result


@router.post(
    "/profile/change-requests/{request_id}/set-fee",
    summary="Impose a fee on a profile change request",
    description=(
        "Goddess imposes a GBP fee that the sub must pay before the profile change is applied. "
        "Moves the request to `awaiting_fee_payment` status."
    ),
    response_model=ProfileChangeRequestOut,
    status_code=200,
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409},
)
async def set_fee(
    request_id: UUID,
    body: GoddessSetFeeIn,
    goddess: User = Depends(require_role(UserRole.goddess)),
    session: AsyncSession = Depends(get_session),
) -> ProfileChangeRequestOut:
    """Impose a fee on a pending change request."""
    ctrl = ProfileController(session)
    result = await ctrl.set_fee(request_id, goddess, body)
    await session.commit()
    return result


@router.patch(
    "/subs/{sub_id}/profile",
    summary="Directly edit a sub's profile",
    description=(
        "Goddess directly edits profile fields (first_name, last_name, avatar_key) "
        "for a sub linked to her. No change-request flow is required. "
        "Only fields explicitly provided are updated."
    ),
    response_model=UserOut,
    status_code=200,
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404},
)
async def edit_sub_profile(
    sub_id: UUID,
    body: GoddessEditSubProfileIn,
    goddess: User = Depends(require_role(UserRole.goddess)),
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    """Directly edit a sub's profile fields."""
    ctrl = ProfileController(session)
    updated = await ctrl.goddess_edit_sub(goddess, sub_id, body)
    await session.commit()
    return _user_out(updated)
