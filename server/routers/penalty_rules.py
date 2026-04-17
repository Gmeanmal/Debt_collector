from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.penalty_rule_controller import PenaltyRuleController
from core.db import get_session
from decorators.audit import audit
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.penalty_rule import PenaltyRuleIn, PenaltyRuleOut, PenaltyRuleUpdate

_E400 = {"description": "Bad request — invalid payload or business rule violation"}
_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch"}
_E404 = {"description": "Not found — penalty rule does not exist"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}

router = APIRouter(prefix="/goddess/penalty-rules", tags=["penalty-rules"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> PenaltyRuleController:
    return PenaltyRuleController(session)


@router.get(
    "",
    summary="List penalty rules",
    description=(
        "Returns every penalty rule owned by the authenticated goddess, ordered by "
        "creation time. Rules are consulted by ritual, task, rolling and contract "
        "crons before applying default penalties."
    ),
    response_model=list[PenaltyRuleOut],
    status_code=200,
    tags=["penalty-rules"],
    responses={401: _E401, 403: _E403},
)
async def list_penalty_rules(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PenaltyRuleController = Depends(_ctrl),
) -> list[PenaltyRuleOut]:
    """Return the goddess's penalty rules."""
    return await ctrl.list_for_goddess(user)


@router.post(
    "",
    summary="Create a penalty rule",
    description=(
        "Creates a penalty rule that the cron engine will consult when the given "
        "trigger fires. Leave ``sub_id`` null to apply the rule to every sub under "
        "this goddess; sub-specific rules take precedence over goddess-wide ones. "
        "``action=notify_only`` records a penalty_event without touching the balance. "
        "``action=apply_points`` emits a merit_event with ``points_delta``. "
        "``action=apply_fee`` stores ``fee_amount`` for future use."
    ),
    response_model=PenaltyRuleOut,
    status_code=201,
    tags=["penalty-rules"],
    responses={400: _E400, 401: _E401, 403: _E403, 422: _E422},
)
@audit(kind="penalty_rule_created", entity="penalty_rule")
async def create_penalty_rule(
    body: PenaltyRuleIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PenaltyRuleController = Depends(_ctrl),
) -> PenaltyRuleOut:
    """Create a new penalty rule owned by the goddess."""
    result = await ctrl.create(user, body)
    await session.commit()
    return result


@router.patch(
    "/{rule_id}",
    summary="Update a penalty rule",
    description=(
        "Partially updates a penalty rule. Only the supplied fields are applied; "
        "omitted fields keep their previous value. Changing ``sub_id`` revalidates "
        "that the target sub belongs to the authenticated goddess."
    ),
    response_model=PenaltyRuleOut,
    status_code=200,
    tags=["penalty-rules"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 422: _E422},
)
@audit(kind="penalty_rule_updated", entity="penalty_rule")
async def update_penalty_rule(
    rule_id: UUID,
    body: PenaltyRuleUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PenaltyRuleController = Depends(_ctrl),
) -> PenaltyRuleOut:
    """Apply a partial update to the given penalty rule."""
    result = await ctrl.update(user, rule_id, body)
    await session.commit()
    return result


@router.delete(
    "/{rule_id}",
    summary="Delete a penalty rule",
    description=(
        "Hard-deletes a penalty rule. Past ``penalty_event`` rows are cascade-deleted "
        "via the foreign key so subsequent cooldown lookups behave as if the rule had "
        "never existed."
    ),
    response_model=None,
    status_code=204,
    tags=["penalty-rules"],
    responses={401: _E401, 403: _E403, 404: _E404},
)
@audit(kind="penalty_rule_deleted", entity="penalty_rule")
async def delete_penalty_rule(
    rule_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PenaltyRuleController = Depends(_ctrl),
) -> Response:
    """Delete a penalty rule owned by the goddess."""
    await ctrl.delete(user, rule_id)
    await session.commit()
    return Response(status_code=204)
