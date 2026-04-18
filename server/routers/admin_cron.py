from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.cron_controller import CronController, CronRunResult
from core.db import get_session
from daos.admin_action_dao import AdminActionDao
from dependencies.auth import require_role
from models.cron_run import CronRun
from models.user import User, UserRole

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — admin role required"}
_E409 = {"description": "Conflict — dry-run precondition not met"}

router = APIRouter(tags=["admin-cron"])


class CronRunSummaryOut(BaseModel):
    run_id: UUID = Field(
        ...,
        description="Unique ID of this cron run",
        examples=["b3e1c2d4-0000-0000-0000-000000000001"],
    )
    started_at: datetime = Field(..., description="UTC timestamp when the run started")
    finished_at: datetime | None = Field(
        None,
        description="UTC timestamp when the run finished (null if crashed mid-run)",
    )
    dry_run: bool = Field(..., description="True if no mutations were persisted", examples=[True])
    summary: dict[str, int] = Field(
        ...,
        description="Counters: subs, rolling, contracts",
        examples=[{"subs": 3, "rolling": 2, "contracts": 1}],
    )
    errors: list[dict[str, str]] = Field(
        default_factory=list,
        description="Per-sub errors captured during the run",
    )
    duration_ms: int | None = Field(None, description="Wall-clock duration in milliseconds")


class ApplyBody(BaseModel):
    last_dry_run_id: UUID = Field(
        ...,
        description="ID of a dry-run completed by this admin in the last 5 minutes",
        examples=["b3e1c2d4-0000-0000-0000-000000000001"],
    )


def _result_to_out(r: CronRunResult) -> CronRunSummaryOut:
    return CronRunSummaryOut(
        run_id=r.run_id,
        started_at=r.started_at,
        finished_at=r.finished_at,
        dry_run=r.dry_run,
        summary=r.summary,
        errors=r.errors,
        duration_ms=r.duration_ms,
    )


def _run_to_out(run: CronRun) -> CronRunSummaryOut:
    return CronRunSummaryOut(
        run_id=run.id,
        started_at=run.started_at,
        finished_at=run.finished_at,
        dry_run=run.dry_run,
        summary=run.summary_json,
        errors=run.errors,
        duration_ms=run.duration_ms,
    )


async def _write_audit(
    session: AsyncSession,
    admin: User,
    kind: str,
    run_id: UUID,
) -> None:
    # @audit decorator cannot extract entity_id from CronRunSummaryOut.run_id
    # (decorator looks for result.id); written manually so the audit row is complete.
    await AdminActionDao(session).record(
        admin_id=admin.id,
        action=kind,
        entity="cron_run",
        entity_id=run_id,
    )


@router.post(
    "/admin/cron/dry-run",
    summary="Preview the daily cron job (no writes)",
    description=(
        "Runs the daily cron job logic inside a rolled-back savepoint so no mutations "
        "are persisted. Returns a summary of what *would* have been applied — subs touched, "
        "rolling tributes, contract ticks — plus any per-sub errors captured without aborting "
        "the whole run. Admin only. Use the returned `run_id` as `last_dry_run_id` when calling "
        "`/admin/cron/apply` within the next 5 minutes."
    ),
    response_model=CronRunSummaryOut,
    status_code=200,
    tags=["admin-cron"],
    responses={401: _E401, 403: _E403},
)
async def dry_run_cron(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_role(UserRole.admin)),
) -> CronRunSummaryOut:
    """Fire a dry-run and return the preview summary."""
    ctrl = CronController(session)
    result = await ctrl.run_daily(dry_run=True, triggered_by_user_id=admin.id)
    await _write_audit(session, admin, "cron_run", result.run_id)
    await session.commit()
    return _result_to_out(result)


@router.post(
    "/admin/cron/apply",
    summary="Apply the daily cron job",
    description=(
        "Executes the daily cron job for real. Requires a `last_dry_run_id` pointing to a "
        "dry-run completed by the same admin within the last 5 minutes. "
        "Returns 409 Conflict if the precondition is not met (run not found, not a dry-run, "
        "triggered by a different admin, or older than 5 minutes). Admin only."
    ),
    response_model=CronRunSummaryOut,
    status_code=200,
    tags=["admin-cron"],
    responses={401: _E401, 403: _E403, 409: _E409},
)
async def apply_cron(
    body: ApplyBody,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_role(UserRole.admin)),
) -> CronRunSummaryOut:
    """Validate dry-run preconditions then execute the real daily cron job."""
    ctrl = CronController(session)
    await ctrl.validate_apply_preconditions(
        last_dry_run_id=body.last_dry_run_id,
        requesting_user_id=admin.id,
    )
    result = await ctrl.run_daily(dry_run=False, triggered_by_user_id=admin.id)
    await _write_audit(session, admin, "cron_run", result.run_id)
    await session.commit()
    return _result_to_out(result)


@router.get(
    "/admin/cron/runs",
    summary="List recent cron runs",
    description=(
        "Returns the most recent cron run records (dry-runs and real runs alike), newest first. "
        "Use `limit` to control page size (1–200, default 50). Admin only."
    ),
    response_model=list[CronRunSummaryOut],
    status_code=200,
    tags=["admin-cron"],
    responses={401: _E401, 403: _E403},
)
async def list_cron_runs(
    limit: int = Query(default=50, ge=1, le=200, description="Maximum number of runs to return"),
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_role(UserRole.admin)),
) -> list[CronRunSummaryOut]:
    """Return recent cron run history for the admin dashboard."""
    _ = admin
    ctrl = CronController(session)
    runs = await ctrl.list_runs(limit=limit)
    return [_run_to_out(r) for r in runs]
