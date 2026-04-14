from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from daos.debt_event_dao import DebtEventDao
from daos.rolling_dao import RollingTributeDao
from models.debt import DebtContract, DebtContractStatus
from models.debt_event import DebtEvent, EventType
from models.user import User, UserRole, UserStatus
from utils.finance import period_rate
from utils.ledger import apply_event_and_recompute
from utils.periods import current_period_index
from utils.rolling import days_late

log = structlog.get_logger()


def _now_utc() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class CronController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._event_dao = DebtEventDao(session)
        self._rolling_dao = RollingTributeDao(session)

    async def run_daily(self) -> dict[str, int]:
        now = _now_utc()
        subs = await self._load_active_subs()
        processed_rolling = 0
        processed_contracts = 0
        for sub in subs:
            processed_rolling += await self._process_rolling(sub.id, now)
            processed_contracts += await self._process_contracts(sub.id, now)
        return {"subs": len(subs), "rolling": processed_rolling, "contracts": processed_contracts}

    async def _load_active_subs(self) -> list[User]:
        result = await self._session.execute(
            select(User).where(
                col(User.role) == UserRole.sub,
                col(User.status) == UserStatus.active,
            )
        )
        return list(result.scalars().all())

    async def _process_rolling(self, sub_id: UUID, now: datetime) -> int:
        rolling = await self._rolling_dao.get_for_sub(sub_id)
        if rolling is None or rolling.paused or rolling.amount == 0:
            return 0
        late = days_late(rolling, now)
        if late > 0:
            log.info("rolling_late", sub_id=str(sub_id), days_late=late)
        else:
            log.info("rolling_reminder", sub_id=str(sub_id))
        return 1

    async def _process_contracts(self, sub_id: UUID, now: datetime) -> int:
        result = await self._session.execute(
            select(DebtContract).where(
                col(DebtContract.sub_id) == sub_id,
                col(DebtContract.status) == DebtContractStatus.active,
            )
        )
        contracts = list(result.scalars().all())
        count = 0
        for contract in contracts:
            if await self._tick_contract(contract, now):
                count += 1
        return count

    async def _tick_contract(self, contract: DebtContract, now: datetime) -> bool:
        period_idx = current_period_index(contract, now)
        if period_idx <= 0:
            return False
        if await self._event_dao.exists_for_period(
            contract.id, period_idx, EventType.period_interest
        ):
            return False

        prev_idx = period_idx - 1
        is_late = prev_idx >= 1 and not await self._had_min_payment_for_period(contract, prev_idx)
        if is_late:
            await apply_event_and_recompute(
                self._session,
                DebtEvent(
                    contract_id=contract.id,
                    event_type=EventType.late_penalty,
                    amount=Decimal(str(contract.late_penalty_percent)),
                    period_index=prev_idx,
                    note="missed minimum payment",
                ),
            )

        rate = period_rate(contract)
        await apply_event_and_recompute(
            self._session,
            DebtEvent(
                contract_id=contract.id,
                event_type=EventType.period_interest,
                amount=rate,
                period_index=period_idx,
            ),
        )
        log.info(
            "contract_period_tick",
            contract_id=str(contract.id),
            period_index=period_idx,
            late=is_late,
        )
        return True

    async def _had_min_payment_for_period(self, contract: DebtContract, period_idx: int) -> bool:
        # Payments since the previous period_interest event count toward this period.
        prev_interest_ts = await self._session.execute(
            select(DebtEvent).where(
                col(DebtEvent.contract_id) == contract.id,
                col(DebtEvent.event_type) == EventType.period_interest,
                col(DebtEvent.period_index) == period_idx,
            )
        )
        anchor = prev_interest_ts.scalar_one_or_none()
        if anchor is None:
            return True

        result = await self._session.execute(
            select(DebtEvent).where(
                col(DebtEvent.contract_id) == contract.id,
                col(DebtEvent.event_type) == EventType.payment_applied,
                col(DebtEvent.created_at) >= anchor.created_at,
            )
        )
        payments = list(result.scalars().all())
        total = sum((Decimal(str(p.amount)) for p in payments), Decimal("0"))
        return total >= Decimal(str(contract.minimum_payment))
