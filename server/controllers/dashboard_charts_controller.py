from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from daos.dashboard_charts_dao import DashboardChartsDao
from models.user import User, UserStatus
from schemas.dashboard_charts import (
    ContractStateCount,
    DailyLateCount,
    DashboardChartsOut,
    MethodBreakdownItem,
    MonthlyRevenueBucket,
    SubStatusCount,
    TopSubRevenue,
)

_ALL_STATUSES = [
    UserStatus.pending_entry_tribute,
    UserStatus.active,
    UserStatus.blacklisted,
]


class DashboardChartsController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = DashboardChartsDao(session)

    async def goddess_charts(self, goddess_user: User) -> DashboardChartsOut:
        goddess_id: UUID = await resolve_goddess_id(self._session, goddess_user.id)

        monthly_rows = await self._dao.monthly_revenue(goddess_id)
        monthly = [
            MonthlyRevenueBucket(month=label, rolling=r, one_off=o, contract=c)
            for label, r, o, c in monthly_rows
        ]

        method_rows = await self._dao.method_breakdown(goddess_id)
        methods = [
            MethodBreakdownItem(method_type=mt, total=total, count=count)
            for mt, total, count in method_rows
        ]

        status_map = await self._dao.subs_by_status(goddess_id)
        subs_by_status = []
        seen = set(status_map.keys())
        for status in _ALL_STATUSES:
            s = status.value
            rolling_c, contract_c = status_map.get(s, (0, 0))
            subs_by_status.append(
                SubStatusCount(
                    status=s,
                    rolling_count=rolling_c,
                    contract_count=contract_c,
                )
            )
        for s in seen:
            if s not in {st.value for st in _ALL_STATUSES}:
                rolling_c, contract_c = status_map[s]
                subs_by_status.append(
                    SubStatusCount(
                        status=s,
                        rolling_count=rolling_c,
                        contract_count=contract_c,
                    )
                )

        top_rows = await self._dao.top_subs(goddess_id)
        top_subs = [
            TopSubRevenue(display_name=name, username=uname, total=total)
            for name, uname, total in top_rows
        ]

        daily_rows = await self._dao.daily_late_counts(goddess_id)
        daily_late = [DailyLateCount(date=d, count=c) for d, c in daily_rows]

        active_c, completed_c, breached_c = await self._dao.contract_states(goddess_id)
        contract_states = ContractStateCount(
            active=active_c,
            completed=completed_c,
            breached=breached_c,
        )

        return DashboardChartsOut(
            monthly_revenue=monthly,
            method_breakdown=methods,
            subs_by_status=subs_by_status,
            top_subs=top_subs,
            daily_late_counts=daily_late,
            contract_states=contract_states,
        )
