from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.dashboard_charts_controller import DashboardChartsController
from controllers.dashboard_controller import DashboardController
from controllers.dashboard_summary_controller import DashboardSummaryController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.dashboard import DashboardSummary, GoddessDashboardOut, SubDashboardOut, SubPlanningOut
from schemas.dashboard_charts import DashboardChartsOut

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — caller role is not permitted for this dashboard"}
_E500 = {"description": "Internal server error"}

goddess_router = APIRouter(prefix="/goddess", tags=["dashboards"])
sub_router = APIRouter(prefix="/sub", tags=["dashboards"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> DashboardController:
    return DashboardController(session)


def _charts_ctrl(session: AsyncSession = Depends(get_session)) -> DashboardChartsController:
    return DashboardChartsController(session)


def _summary_ctrl(session: AsyncSession = Depends(get_session)) -> DashboardSummaryController:
    return DashboardSummaryController(session)


@goddess_router.get(
    "/dashboard/charts",
    summary="Goddess dashboard chart aggregates",
    description=(
        "Returns pre-aggregated chart data for the goddess dashboard: 12-month revenue "
        "split by payment type (rolling / one-off / contract), payment method breakdown, "
        "sub counts by user status with rolling/contract splits, top 5 subs by revenue, "
        "30-day daily late-sub counts, and current contract state totals. "
        "All monetary amounts are GBP. Months are Europe/London calendar months."
    ),
    response_model=DashboardChartsOut,
    status_code=200,
    tags=["dashboards"],
    responses={401: _E401, 403: _E403, 500: _E500},
)
async def goddess_dashboard_charts(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DashboardChartsController = Depends(_charts_ctrl),
) -> DashboardChartsOut:
    return await ctrl.goddess_charts(user)


@goddess_router.get(
    "/dashboard/summary",
    summary="Aggregated dashboard counters for the goddess",
    description=(
        "Returns a single DTO containing all KPI counters consumed by the goddess dashboard "
        "and welcome tiles.\n\n"
        "**Active-only scoping:** `subs_active` counts only users with `role=sub` and "
        "`status=active` — pending-entry-tribute and blacklisted subs are excluded. "
        "`contracts_active` counts only debt contracts with `status=active`; pending, "
        "closed, breached, completed, and cancelled contracts are excluded.\n\n"
        "**`validations_oldest_age_h`:** Hours elapsed (floor) since the oldest "
        "pending-validation payment was declared. Returns 0 when no payments are pending.\n\n"
        "**`subs_paused`:** Always 0 — the current schema has no paused user status. "
        "The field is present for forward compatibility.\n\n"
        "**`late_rolling_count`:** Uses the same predicate as the `/goddess/late-subs` "
        "endpoint: active subs with a non-paused, non-zero rolling tribute where "
        "`days_late > 0`.\n\n"
        "**`late_contract_count`:** Active contracts whose current period payment has not "
        "been applied and the period deadline has passed, consistent with the late-payment "
        "logic in `/goddess/dashboard`."
    ),
    response_model=DashboardSummary,
    status_code=200,
    tags=["dashboards"],
    responses={401: _E401, 403: _E403, 500: _E500},
)
async def goddess_dashboard_summary(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DashboardSummaryController = Depends(_summary_ctrl),
) -> DashboardSummary:
    return await ctrl.goddess_summary(user)


@goddess_router.get(
    "/dashboard",
    summary="Goddess dashboard overview",
    description=(
        "Returns aggregate metrics for the goddess home view: sub counts by status, "
        "active rolling and contract counts, pending validation queues, the list of "
        "late payments across all subs (capped at 50), and the total drained amount "
        "(sum of all validated payments for this goddess)."
    ),
    response_model=GoddessDashboardOut,
    status_code=200,
    tags=["dashboards"],
    responses={401: _E401, 403: _E403, 500: _E500},
)
async def goddess_dashboard(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DashboardController = Depends(_ctrl),
) -> GoddessDashboardOut:
    return await ctrl.goddess_overview(user)


@sub_router.get(
    "/dashboard",
    summary="Sub dashboard overview",
    description=(
        "Returns aggregate metrics for the sub home view: amount due this week "
        "(rolling amount_due plus weekly contract minimum payments), whether the sub "
        "is currently late on any obligation, the list of active contracts with "
        "progress, the last 10 payment declarations, and the total amount sent "
        "(sum of all validated payments)."
    ),
    response_model=SubDashboardOut,
    status_code=200,
    tags=["dashboards"],
    responses={401: _E401, 403: _E403, 500: _E500},
)
async def sub_dashboard(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: DashboardController = Depends(_ctrl),
) -> SubDashboardOut:
    return await ctrl.sub_overview(user)


@sub_router.get(
    "/planning",
    summary="Sub 30-day payment planning data",
    description=(
        "Returns upcoming payment deadlines for the next 30 Europe/London calendar days "
        "(rolling tribute cycles and active contract instalments), the last 12 weeks of "
        "validated payment history (totals per week), and KPI figures: "
        "total paid all-time, total paid this calendar month, and the estimated rolling "
        "amount still owed before the end of the current month."
    ),
    response_model=SubPlanningOut,
    status_code=200,
    tags=["dashboards"],
    responses={401: _E401, 403: _E403, 500: _E500},
)
async def sub_planning(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: DashboardController = Depends(_ctrl),
) -> SubPlanningOut:
    return await ctrl.sub_planning(user)
