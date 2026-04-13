from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.invitation_controller import InvitationController
from core.db import get_session
from schemas.auth import TokenPair
from schemas.invitation import SignupRequest

router = APIRouter(prefix="/invite", tags=["invitations"])

_ERROR_400 = {"description": "Bad request — duplicate email or username"}
_ERROR_404 = {"description": "Not found — token does not exist"}
_ERROR_409 = {"description": "Conflict — invitation expired, already used, or email/username taken"}
_ERROR_422 = {"description": "Unprocessable entity — request body validation failed"}
_ERROR_500 = {"description": "Internal server error"}


def _build_controller(session: AsyncSession = Depends(get_session)) -> InvitationController:
    return InvitationController(session)


@router.post(
    "/{token}/signup",
    summary="Sign up via invitation link",
    description=(
        "Creates a new sub account linked to the Goddess who owns the invitation. "
        "The sub is created with `status=pending_entry_tribute`. "
        "The invitation token is consumed atomically with user creation. "
        "Returns a token pair so the sub is immediately logged in."
    ),
    response_model=TokenPair,
    status_code=201,
    responses={
        400: _ERROR_400,
        404: _ERROR_404,
        409: _ERROR_409,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def signup_via_invite(
    token: str,
    body: SignupRequest,
    session: AsyncSession = Depends(get_session),
    ctrl: InvitationController = Depends(_build_controller),
) -> TokenPair:
    result = await ctrl.consume(token, body)
    await session.commit()
    return result
