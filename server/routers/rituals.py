from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.ritual_controller import RitualController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.rituals import (
    OccurrenceCompleteIn,
    OccurrenceOut,
    OccurrenceRejectIn,
    OccurrenceSubmitIn,
    RitualCreateIn,
    RitualOut,
    RitualUpdateIn,
)

_E400 = {"description": "Bad request — invalid payload or business rule violation"}
_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch"}
_E404 = {"description": "Not found — ritual, occurrence, or sub does not exist"}
_E409 = {"description": "Conflict — illegal status transition"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}

goddess_router = APIRouter(tags=["rituals"])
sub_router = APIRouter(tags=["rituals"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> RitualController:
    return RitualController(session)


# ---------------------------------------------------------------------------
# Goddess — ritual CRUD
# ---------------------------------------------------------------------------


@goddess_router.post(
    "/goddess/subs/{sub_id}/rituals",
    summary="Create a ritual for a sub",
    description=(
        "Creates a recurring ritual obligation for the given sub. "
        "The sub must belong to the authenticated goddess. "
        "When `frequency=custom` a non-null `custom_days_bitmask` is required."
    ),
    response_model=RitualOut,
    status_code=201,
    tags=["rituals"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 422: _E422},
)
async def create_ritual(
    sub_id: UUID,
    body: RitualCreateIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: RitualController = Depends(_ctrl),
) -> RitualOut:
    result = await ctrl.create_ritual(user, sub_id, body)
    await session.commit()
    return result


@goddess_router.get(
    "/goddess/subs/{sub_id}/rituals",
    summary="List a sub's rituals",
    description=(
        "Returns all rituals assigned to the given sub, including paused ones. "
        "The sub must belong to the authenticated goddess."
    ),
    response_model=list[RitualOut],
    status_code=200,
    tags=["rituals"],
    responses={401: _E401, 403: _E403, 404: _E404},
)
async def list_rituals_for_sub(
    sub_id: UUID,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: RitualController = Depends(_ctrl),
) -> list[RitualOut]:
    return await ctrl.list_rituals_for_sub(user, sub_id)


@goddess_router.patch(
    "/goddess/rituals/{ritual_id}",
    summary="Partially update a ritual",
    description=(
        "Updates mutable fields on a ritual owned by the authenticated goddess. "
        "Only supplied fields are changed; omitted fields remain unchanged."
    ),
    response_model=RitualOut,
    status_code=200,
    tags=["rituals"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 422: _E422},
)
async def update_ritual(
    ritual_id: UUID,
    body: RitualUpdateIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: RitualController = Depends(_ctrl),
) -> RitualOut:
    result = await ctrl.update_ritual(user, ritual_id, body)
    await session.commit()
    return result


@goddess_router.delete(
    "/goddess/rituals/{ritual_id}",
    summary="Delete a ritual",
    description=(
        "Hard-deletes a ritual and all its occurrences (cascade). "
        "The ritual must belong to the authenticated goddess."
    ),
    response_model=None,
    status_code=204,
    tags=["rituals"],
    responses={401: _E401, 403: _E403, 404: _E404},
)
async def delete_ritual(
    ritual_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: RitualController = Depends(_ctrl),
) -> Response:
    await ctrl.delete_ritual(user, ritual_id)
    await session.commit()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Goddess — occurrence review
# ---------------------------------------------------------------------------


@goddess_router.post(
    "/goddess/rituals/occurrences/{occurrence_id}/approve",
    summary="Approve a submitted ritual occurrence",
    description=(
        "Transitions a `submitted` occurrence to `completed`. "
        "Returns 409 if the occurrence is not in `submitted` status."
    ),
    response_model=OccurrenceOut,
    status_code=200,
    tags=["rituals"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409},
)
async def approve_occurrence(
    occurrence_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: RitualController = Depends(_ctrl),
) -> OccurrenceOut:
    result = await ctrl.approve_occurrence(user, occurrence_id)
    await session.commit()
    return result


@goddess_router.post(
    "/goddess/rituals/occurrences/{occurrence_id}/reject",
    summary="Reject a submitted ritual occurrence",
    description=(
        "Transitions a `submitted` occurrence to `rejected`. "
        "An optional `reason` is stored on the occurrence. "
        "Returns 409 if the occurrence is not in `submitted` status."
    ),
    response_model=OccurrenceOut,
    status_code=200,
    tags=["rituals"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422},
)
async def reject_occurrence(
    occurrence_id: UUID,
    body: OccurrenceRejectIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: RitualController = Depends(_ctrl),
) -> OccurrenceOut:
    result = await ctrl.reject_occurrence(user, occurrence_id, body)
    await session.commit()
    return result


# ---------------------------------------------------------------------------
# Sub — own rituals and occurrences
# ---------------------------------------------------------------------------


@sub_router.get(
    "/sub/rituals",
    summary="List own active rituals",
    description="Returns non-paused rituals assigned to the authenticated sub.",
    response_model=list[RitualOut],
    status_code=200,
    tags=["rituals"],
    responses={401: _E401, 403: _E403},
)
async def list_own_rituals(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: RitualController = Depends(_ctrl),
) -> list[RitualOut]:
    return await ctrl.list_own_rituals(user)


@sub_router.get(
    "/sub/rituals/today",
    summary="Today's ritual occurrences",
    description=(
        "Returns ritual_occurrence rows for today (Europe/London date) for the "
        "authenticated sub. Rows are created by the daily cron at 00:00 London time."
    ),
    response_model=list[OccurrenceOut],
    status_code=200,
    tags=["rituals"],
    responses={401: _E401, 403: _E403},
)
async def list_today_occurrences(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: RitualController = Depends(_ctrl),
) -> list[OccurrenceOut]:
    return await ctrl.list_today_occurrences(user)


@sub_router.post(
    "/sub/rituals/occurrences/{occurrence_id}/complete",
    summary="Mark a ritual occurrence as completed",
    description=(
        "Transitions a `pending` occurrence to `completed`. "
        "Optionally accepts a note and/or an evidence R2 key (B4 wires actual upload). "
        "Returns 409 if the occurrence is not in `pending` status."
    ),
    response_model=OccurrenceOut,
    status_code=200,
    tags=["rituals"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422},
)
async def complete_occurrence(
    occurrence_id: UUID,
    body: OccurrenceCompleteIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: RitualController = Depends(_ctrl),
) -> OccurrenceOut:
    result = await ctrl.complete_occurrence(user, occurrence_id, body)
    await session.commit()
    return result


@sub_router.post(
    "/sub/rituals/occurrences/{occurrence_id}/submit",
    summary="Submit a ritual occurrence for goddess review",
    description=(
        "Transitions a `pending` occurrence to `submitted`, flagging it for goddess review. "
        "Optionally accepts a note and/or evidence R2 key. "
        "Returns 409 if the occurrence is not in `pending` status."
    ),
    response_model=OccurrenceOut,
    status_code=200,
    tags=["rituals"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422},
)
async def submit_occurrence(
    occurrence_id: UUID,
    body: OccurrenceSubmitIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: RitualController = Depends(_ctrl),
) -> OccurrenceOut:
    result = await ctrl.submit_occurrence(user, occurrence_id, body)
    await session.commit()
    return result
