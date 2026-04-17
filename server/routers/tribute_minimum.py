from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.tribute_minimum_controller import TributeMinimumController
from core.db import get_session
from decorators.audit import audit
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.tribute_minimum import TributeGaugeOut, TributeMinimumOut, TributeMinimumUpsertIn

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch"}
_E404 = {"description": "Not found — tribute_minimum not configured for this sub"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}

goddess_router = APIRouter(prefix="/goddess/subs", tags=["tribute-minimum"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> TributeMinimumController:
    return TributeMinimumController(session)


@goddess_router.put(
    "/{sub_id}/tribute-minimum",
    summary="Upsert tribute minimum for a sub",
    description=(
        "Creates or updates the tribute minimum schedule for a sub. "
        "Returns 201 on first write and 200 on subsequent updates. "
        "Validates that the sub belongs to the authenticated goddess."
    ),
    response_model=TributeMinimumOut,
    status_code=200,
    tags=["tribute-minimum"],
    responses={
        201: {"description": "Created — tribute minimum configured for the first time"},
        401: _E401,
        403: _E403,
        422: _E422,
    },
)
@audit(kind="tribute_minimum_upserted", entity="tribute_minimum")
async def upsert_tribute_minimum(
    sub_id: UUID,
    body: TributeMinimumUpsertIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: TributeMinimumController = Depends(_ctrl),
) -> Response:
    """Upsert the tribute minimum config and return 201 on create, 200 on update."""
    out, created = await ctrl.upsert(user, sub_id, body)
    await session.commit()
    status = 201 if created else 200
    return Response(
        content=out.model_dump_json(),
        status_code=status,
        media_type="application/json",
    )


@goddess_router.get(
    "/{sub_id}/tribute-minimum",
    summary="Get tribute minimum for a sub",
    description=(
        "Returns the currently configured tribute minimum schedule for the given sub. "
        "Returns 404 if no configuration exists."
    ),
    response_model=TributeMinimumOut,
    status_code=200,
    tags=["tribute-minimum"],
    responses={401: _E401, 403: _E403, 404: _E404},
)
async def get_tribute_minimum(
    sub_id: UUID,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: TributeMinimumController = Depends(_ctrl),
) -> TributeMinimumOut:
    """Return the tribute minimum config for a sub."""
    return await ctrl.get(user, sub_id)


@goddess_router.delete(
    "/{sub_id}/tribute-minimum",
    summary="Delete tribute minimum for a sub",
    description=(
        "Removes the tribute minimum configuration for the given sub. "
        "Returns 204 on success, 404 if no config exists."
    ),
    response_model=None,
    status_code=204,
    tags=["tribute-minimum"],
    responses={401: _E401, 403: _E403, 404: _E404},
)
@audit(kind="tribute_minimum_deleted", entity="tribute_minimum")
async def delete_tribute_minimum(
    sub_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: TributeMinimumController = Depends(_ctrl),
) -> Response:
    """Delete the tribute minimum config for a sub."""
    await ctrl.delete(user, sub_id)
    await session.commit()
    return Response(status_code=204)


@goddess_router.get(
    "/{sub_id}/tribute-minimum/gauge",
    summary="Get tribute performance gauge for a sub",
    description=(
        "Returns a read-only performance gauge showing how much the sub has contributed "
        "this period relative to the configured tribute minimum. "
        "When not configured, falls back to the current calendar month and returns "
        "`configured=false`, `color=green`, and null target fields. "
        "Period boundaries are computed in Europe/London and returned as UTC."
    ),
    response_model=TributeGaugeOut,
    status_code=200,
    tags=["tribute-minimum"],
    responses={401: _E401, 403: _E403},
)
async def get_tribute_gauge(
    sub_id: UUID,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: TributeMinimumController = Depends(_ctrl),
) -> TributeGaugeOut:
    """Return the tribute performance gauge for a sub."""
    return await ctrl.gauge(user, sub_id)
