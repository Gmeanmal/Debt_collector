# Rate-limiting for this endpoint (e.g. 3 calls/hour per sub) should use the
# project-wide `core.rate_limit.limiter` (slowapi) once D5 is hardened in phase J.
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.panic_controller import PanicController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.panic import PanicOut

_ERROR_400 = {"description": "Bad request — malformed input"}
_ERROR_401 = {
    "description": (
        "Unauthorized — missing/invalid access token, "
        "or X-Confirm-Password did not match (error: re_auth_failed)"
    )
}
_ERROR_409 = {"description": "Conflict — sub has no active goddess assignment"}

router = APIRouter(tags=["panic"])


def _build_controller(session: AsyncSession = Depends(get_session)) -> PanicController:
    return PanicController(session)


@router.post(
    "/sub/panic",
    summary="Trigger emergency stop",
    description=(
        "Atomically pauses all non-paused rituals owned by the calling sub, "
        "soft-releases the ownership status to `released` (via the B3 state machine), "
        "and emits a high-priority `sub_panic` notification to the goddess. "
        "\n\n"
        "The caller must supply the current password in the `X-Confirm-Password` header "
        "as a re-authentication guard. A mismatch returns 401 with error `re_auth_failed`. "
        "\n\n"
        "Task cancellation (status ∈ {open, submitted}) is deferred pending roadmap task E3 "
        "(Task model not yet landed). The response field `tasks_pending_e3` will be `true` "
        "until E3 ships. "
        "\n\n"
        "The entire operation executes in a single DB transaction committed by this endpoint."
    ),
    response_model=PanicOut,
    status_code=200,
    tags=["panic"],
    responses={
        400: _ERROR_400,
        401: _ERROR_401,
        409: _ERROR_409,
    },
)
async def trigger_panic(
    confirm_password: str = Header(
        ...,
        alias="X-Confirm-Password",
        description="The sub's current password, used as a re-authentication guard.",
        examples=["mysecretpassword"],
    ),
    session: AsyncSession = Depends(get_session),
    sub: User = Depends(require_role(UserRole.sub)),
    ctrl: PanicController = Depends(_build_controller),
) -> PanicOut:
    result = await ctrl.trigger(sub, confirm_password)
    await session.commit()
    return result
