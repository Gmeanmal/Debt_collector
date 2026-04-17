import asyncio
import datetime as dt
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from controllers._goddess import resolve_goddess_id
from controllers.dashboard.helpers import period_start
from daos.debt_dao import DebtContractDao
from daos.invitation_dao import InvitationDao
from daos.payment_dao import PaymentDeclarationDao
from daos.profile_change_request_dao import ProfileChangeRequestDao
from daos.rolling_dao import RollingTributeDao
from daos.sub_photo_dao import SubPhotoDao
from daos.user_dao import UserDao
from models.debt import DebtContractStatus
from models.debt_event import DebtEvent, EventType
from models.user import User
from schemas.dashboard import DashboardSummary
from utils.periods import current_period_index
from utils.rolling import days_late as rolling_days_late


def _now_utc() -> dt.datetime:
    return dt.datetime.now(dt.UTC).replace(tzinfo=None)


class DashboardSummaryController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._user_dao = UserDao(session)
        self._contract_dao = DebtContractDao(session)
        self._invitation_dao = InvitationDao(session)
        self._payment_dao = PaymentDeclarationDao(session)
        self._photo_dao = SubPhotoDao(session)
        self._profile_req_dao = ProfileChangeRequestDao(session)
        self._rolling_dao = RollingTributeDao(session)

    async def goddess_summary(self, goddess_user: User) -> DashboardSummary:
        """Return aggregated KPI counters for the goddess dashboard."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        now = _now_utc()

        active_subs = await self._user_dao.list_active_subs(goddess_id)
        active_sub_ids = [s.id for s in active_subs]

        subs_active = len(active_subs)

        (
            contracts_active,
            contracts_closed,
            inv_active,
            inv_consumed,
            validations_pending,
            oldest_age_h,
            photo_queue,
            profile_req_count,
        ) = await asyncio.gather(
            self._contract_dao.count_by_status(goddess_id, DebtContractStatus.active),
            self._contract_dao.count_by_status(goddess_id, DebtContractStatus.closed),
            self._invitation_dao.count_active(goddess_id, now),
            self._invitation_dao.count_consumed(goddess_id),
            self._payment_dao.count_pending_validation(goddess_id),
            self._payment_dao.oldest_pending_validation_age_hours(goddess_id),
            self._photo_dao.count_pending_review(goddess_id),
            self._profile_req_dao.count_pending(active_sub_ids),
        )

        late_rolling = await self._count_late_rolling(active_subs, now)
        late_contracts = await self._count_late_contracts(goddess_id, active_sub_ids, now)

        return DashboardSummary(
            subs_active=subs_active,
            subs_paused=0,
            contracts_active=contracts_active,
            contracts_closed=contracts_closed,
            invitations_active=inv_active,
            invitations_consumed=inv_consumed,
            validations_pending=validations_pending,
            validations_oldest_age_h=oldest_age_h,
            late_rolling_count=late_rolling,
            late_contract_count=late_contracts,
            photo_queue_count=photo_queue,
            profile_change_requests_count=profile_req_count,
        )

    async def _count_late_rolling(self, active_subs: list[User], now: dt.datetime) -> int:
        """Count active subs whose rolling tribute is currently late."""
        if not active_subs:
            return 0

        sub_ids = [s.id for s in active_subs]
        rollings = await self._rolling_dao.list_for_sub_ids(sub_ids)
        return sum(
            1
            for r in rollings
            if not r.paused
            and Decimal(str(r.amount)) != 0
            and rolling_days_late(r, now) > 0
        )

    async def _count_late_contracts(
        self, goddess_id: UUID, active_sub_ids: list[UUID], now: dt.datetime
    ) -> int:
        """Count active contracts where the current period payment has not been applied."""
        contracts = await self._contract_dao.list_active_for_goddess(goddess_id)
        if not contracts:
            return 0

        active_sub_set = set(active_sub_ids)
        relevant = [c for c in contracts if c.sub_id in active_sub_set and c.signed_at is not None]
        if not relevant:
            return 0

        contract_ids = [c.id for c in relevant]
        result = await self._session.execute(
            select(DebtEvent.contract_id, DebtEvent.period_index).where(
                col(DebtEvent.contract_id).in_(contract_ids),
                col(DebtEvent.event_type) == EventType.payment_applied,
            )
        )
        paid_periods: dict[UUID, set[int]] = {}
        for contract_id, period_index in result.all():
            if period_index is None:
                continue
            paid_periods.setdefault(contract_id, set()).add(period_index)

        count = 0
        for c in relevant:
            idx = current_period_index(c, now)
            p_start = period_start(c, now)
            if p_start is None:
                continue
            days_into_period = (now.date() - p_start.date()).days
            if days_into_period <= 0:
                continue
            if idx not in paid_periods.get(c.id, set()):
                count += 1
        return count
