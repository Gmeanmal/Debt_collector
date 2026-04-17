from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.invitation_controller import InvitationController
from core.db import get_session
from decorators.audit import audit
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.invitation import InvitationCreate, InvitationOut

router = APIRouter(prefix="/goddess/invitations", tags=["invitations"])

_ERROR_401 = {"description": "Unauthorized — missing or invalid access token"}
_ERROR_403 = {"description": "Forbidden — caller is not a goddess or has no goddess profile"}
_ERROR_422 = {"description": "Unprocessable entity — request body validation failed"}
_ERROR_500 = {"description": "Internal server error"}


def _build_controller(session: AsyncSession = Depends(get_session)) -> InvitationController:
    return InvitationController(session)


@router.post(
    "/",
    summary="Create an invitation link",
    description=(
        "Creates a new invitation token that a sub can use to sign up. "
        "Sets an entry tribute amount the sub must declare after signup. "
        "The invitation expires after `expires_in_days` days (default 7) and is single-use."
    ),
    response_model=InvitationOut,
    status_code=201,
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
@audit(kind="invitation_created", entity="invitation")
async def create_invitation(
    body: InvitationCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: InvitationController = Depends(_build_controller),
) -> InvitationOut:
    result = await ctrl.create(user.id, body)
    await session.commit()
    return result


@router.get(
    "/",
    summary="List all invitations created by the Goddess",
    description=(
        "Returns all invitations created by this Goddess, ordered newest first. "
        "Includes pending, expired, and used invitations."
    ),
    response_model=list[InvitationOut],
    status_code=200,
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        500: _ERROR_500,
    },
)
async def list_invitations(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: InvitationController = Depends(_build_controller),
) -> list[InvitationOut]:
    return await ctrl.list_for_goddess(user.id)
