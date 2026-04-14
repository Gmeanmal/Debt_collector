from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.invitation_controller import InvitationController
from core.config import get_settings
from core.db import get_session
from core.rate_limit import limiter
from schemas.invitation import PublicInvitationOut

router = APIRouter(prefix="/invite", tags=["invitations"])

_settings = get_settings()

_ERROR_404 = {"description": "Not found — token does not exist"}
_ERROR_409 = {"description": "Conflict — invitation has expired or has already been used"}
_ERROR_500 = {"description": "Internal server error"}


def _build_controller(session: AsyncSession = Depends(get_session)) -> InvitationController:
    return InvitationController(session)


@router.get(
    "/{token}",
    summary="Fetch public invitation details",
    description=(
        "Returns the public information for a valid, unused, non-expired invitation. "
        "Used by the invitation landing page before the sub signs up."
    ),
    response_model=PublicInvitationOut,
    status_code=200,
    responses={
        404: _ERROR_404,
        409: _ERROR_409,
        429: {"description": "Too many requests — rate limit exceeded"},
        500: _ERROR_500,
    },
)
@limiter.limit(lambda: _settings.rate_limit_public_invitation)  # type: ignore[misc]
async def get_invitation(
    request: Request,
    token: str,
    ctrl: InvitationController = Depends(_build_controller),
) -> PublicInvitationOut:
    return await ctrl.get_public(token)
