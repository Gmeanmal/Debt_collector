from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.dashboard_charts_controller import DashboardChartsController
from controllers.dashboard_controller import DashboardController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.dashboard import GoddessDashboardOut, SubDashboardOut, SubPlanningOut
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
