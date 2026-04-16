from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.integrations_controller import IntegrationsController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.integrations import ThroneConnectionIn, ThroneConnectionOut

_ERROR_401 = {"description": "Unauthorized — missing or invalid access token"}
_ERROR_403 = {"description": "Forbidden — caller is not a goddess or has no goddess profile"}
_ERROR_422 = {"description": "Unprocessable entity — request body validation failed"}
_ERROR_500 = {"description": "Internal server error"}

router = APIRouter(tags=["integrations"])


def _build_controller(session: AsyncSession = Depends(get_session)) -> IntegrationsController:
    return IntegrationsController(session)


@router.get(
    "/goddess/integrations/throne",
    summary="Get Throne integration status",
    description=(
        "Returns whether the authenticated goddess has a Throne connection configured. "
        "The stored access token is never echoed — only its last 4 characters are exposed "
        "alongside the account id and timestamps. When no connection exists the response "
        "carries `is_configured=false` and all other fields null."
    ),
    response_model=ThroneConnectionOut,
    status_code=200,
    tags=["integrations"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        500: _ERROR_500,
    },
)
async def get_throne_connection(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: IntegrationsController = Depends(_build_controller),
) -> ThroneConnectionOut:
    return await ctrl.get_throne(user.goddess_id)


@router.post(
    "/goddess/integrations/throne",
    summary="Upsert Throne integration credentials",
    description=(
        "Creates or replaces the authenticated goddess's Throne connection. "
        "The access token is encrypted at rest via the per-goddess envelope "
        "(AES-256-GCM, AAD bound to goddess id + field label) before storage; "
        "the server only persists the token's last 4 characters in plaintext for UI echo. "
        "The response mirrors `GET /goddess/integrations/throne`."
    ),
    response_model=ThroneConnectionOut,
    status_code=200,
    tags=["integrations"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def upsert_throne_connection(
    body: ThroneConnectionIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: IntegrationsController = Depends(_build_controller),
) -> ThroneConnectionOut:
    result = await ctrl.upsert_throne(user.goddess_id, body)
    await session.commit()
    return result
