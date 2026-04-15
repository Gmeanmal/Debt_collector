from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.profile_controller import ProfileController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.profile import (
    PaymentHandleIn,
    PaymentHandleOut,
    ProfileChangeRequestIn,
    ProfileChangeRequestOut,
)

_E400 = {"description": "Bad request — validation failed or no fields provided"}
_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — caller is not a sub"}
_E404 = {"description": "Not found — request or method not found"}
_E409 = {"description": "Conflict — request is not in an actionable state"}

router = APIRouter(prefix="/sub", tags=["profile"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> ProfileController:
    return ProfileController(session)


@router.post(
    "/profile/change-requests",
    summary="Submit a profile change request",
    description=(
        "Sub submits a request to change one or more profile fields. "
        "The goddess must approve (free or for a fee) before any changes are applied. "
        "At least one proposed field must be non-null."
    ),
    response_model=ProfileChangeRequestOut,
    status_code=201,
    responses={400: _E400, 401: _E401, 403: _E403},
)
async def create_change_request(
    body: ProfileChangeRequestIn,
    sub: User = Depends(require_role(UserRole.sub)),
    session: AsyncSession = Depends(get_session),
) -> ProfileChangeRequestOut:
    """Submit a profile change request as the authenticated sub."""
    ctrl = ProfileController(session)
    result = await ctrl.request_change(sub, body)
    await session.commit()
    return result


@router.get(
    "/profile/change-requests",
    summary="List my profile change requests",
    description=(
        "Returns all profile change requests submitted by the authenticated sub, newest first."
    ),
    response_model=list[ProfileChangeRequestOut],
    status_code=200,
    responses={401: _E401, 403: _E403},
)
async def list_my_change_requests(
    sub: User = Depends(require_role(UserRole.sub)),
    session: AsyncSession = Depends(get_session),
) -> list[ProfileChangeRequestOut]:
    """List all change requests for the calling sub."""
    ctrl = ProfileController(session)
    return await ctrl.list_my_requests(sub)


@router.patch(
    "/me/payment-handle",
    summary="Update payment handle",
    description=(
        "Sub self-edits their payment handle (max 64 chars). Pass null to clear the handle."
    ),
    response_model=PaymentHandleOut,
    status_code=200,
    responses={400: _E400, 401: _E401, 403: _E403},
)
async def update_payment_handle(
    body: PaymentHandleIn,
    sub: User = Depends(require_role(UserRole.sub)),
    session: AsyncSession = Depends(get_session),
) -> PaymentHandleOut:
    """Update the sub's payment handle."""
    ctrl = ProfileController(session)
    updated = await ctrl.update_payment_handle(sub, body)
    await session.commit()
    return PaymentHandleOut(payment_handle=updated.payment_handle)


@router.post(
    "/profile/change-requests/{request_id}/accept-fee",
    summary="Accept the fee on a change request",
    description=(
        "Sub accepts the goddess-imposed fee on a pending change request. "
        "Creates a profile_change_fee payment declaration which, when validated by the goddess, "
        "will automatically apply the profile diff. "
        "Requires `method_id` query parameter — must be an enabled method belonging to the goddess."
    ),
    response_model=ProfileChangeRequestOut,
    status_code=200,
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409},
)
async def accept_fee(
    request_id: UUID,
    method_id: UUID,
    sub: User = Depends(require_role(UserRole.sub)),
    session: AsyncSession = Depends(get_session),
) -> ProfileChangeRequestOut:
    """Sub accepts the fee by creating a linked payment declaration."""
    ctrl = ProfileController(session)
    result = await ctrl.accept_fee(request_id, sub, method_id)
    await session.commit()
    return result
