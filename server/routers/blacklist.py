from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.blacklist_controller import BlacklistController
from core.db import get_session
from decorators.audit import audit
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.blacklist import BlacklistEntryOut, BreachIn, ForgiveIn

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch"}
_E404 = {"description": "Not found — sub or entry not visible to caller"}
_E409 = {"description": "Conflict — sub already blacklisted or entry already forgiven"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}
_E500 = {"description": "Internal server error"}

router = APIRouter(tags=["blacklist"])


def _build(session: AsyncSession = Depends(get_session)) -> BlacklistController:
    return BlacklistController(session)


@router.post(
    "/goddess/subs/{sub_id}/breach",
    summary="Breach a sub and move them to the blacklist",
    description=(
        "Transitions all active debt contracts for the sub to `breached`, "
        "sets the sub's status to `blacklisted`, revokes all refresh tokens, "
        "and records a blacklist entry snapshotting the sum of breached-contract balances."
    ),
    response_model=BlacklistEntryOut,
    status_code=201,
    tags=["blacklist"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422, 500: _E500},
)
@audit(kind="breach_applied", entity="blacklist_entry")
async def breach_sub(
    sub_id: UUID,
    body: BreachIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: BlacklistController = Depends(_build),
) -> BlacklistEntryOut:
    result = await ctrl.breach(user, sub_id, body.reason)
    await session.commit()
    return result


@router.get(
    "/goddess/blacklist",
    summary="List blacklist entries for this goddess",
    description=(
        "Returns all blacklist entries (forgiven and active) for the authenticated goddess."
    ),
    response_model=list[BlacklistEntryOut],
    status_code=200,
    tags=["blacklist"],
    responses={401: _E401, 403: _E403, 500: _E500},
)
async def list_entries(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: BlacklistController = Depends(_build),
) -> list[BlacklistEntryOut]:
    return await ctrl.list(user)


@router.post(
    "/goddess/blacklist/{entry_id}/forgive",
    summary="Forgive a blacklist entry",
    description=(
        "Marks the entry as forgiven with the reinstatement fee amount, "
        "and restores the sub's status to `active`. "
        "Breached contracts remain in their `breached` state."
    ),
    response_model=BlacklistEntryOut,
    status_code=200,
    tags=["blacklist"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422, 500: _E500},
)
@audit(kind="breach_forgiven", entity="blacklist_entry")
async def forgive(
    entry_id: UUID,
    body: ForgiveIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: BlacklistController = Depends(_build),
) -> BlacklistEntryOut:
    result = await ctrl.forgive(user, entry_id, body.reinstatement_fee_paid)
    await session.commit()
    return result
