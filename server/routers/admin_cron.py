from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.cron_controller import CronController
from core.db import get_session
from decorators.audit import audit
from dependencies.auth import require_role
from models.user import User, UserRole

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — admin role required"}
_E500 = {"description": "Internal server error"}

router = APIRouter(tags=["admin-cron"])


class CronRunOut(BaseModel):
    ok: bool = Field(..., description="Always true on success", examples=[True])
    ran_at: datetime = Field(..., description="UTC datetime when the job was invoked")
    subs: int = Field(..., description="Number of active subs processed", examples=[3])
    rolling: int = Field(..., description="Number of rolling tributes touched", examples=[2])
    contracts: int = Field(..., description="Number of contract period ticks applied", examples=[1])


@router.post(
    "/admin/cron/run-now",
    summary="Run the daily cron job immediately",
    description=(
        "Manually triggers the daily cron job (rolling tributes + contract period ticks). "
        "Admin only. Useful in development and for operational intervention."
    ),
    response_model=CronRunOut,
    status_code=200,
    tags=["admin-cron"],
    responses={401: _E401, 403: _E403, 500: _E500},
)
@audit(kind="cron_run", entity="cron")
async def run_cron_now(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_role(UserRole.admin)),
) -> CronRunOut:
    # kwarg consumed by @audit via runtime kwarg introspection — keep alive
    _ = admin
    ctrl = CronController(session)
    result = await ctrl.run_daily()
    await session.commit()
    return CronRunOut(
        ok=True,
        ran_at=datetime.now(UTC).replace(tzinfo=None),
        subs=result["subs"],
        rolling=result["rolling"],
        contracts=result["contracts"],
    )
