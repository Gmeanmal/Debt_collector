from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import Conflict
from daos.cron_run_dao import CronRunDao
from daos.debt_event_dao import DebtEventDao
from daos.rolling_dao import RollingTributeDao
from models.cron_run import CronRun
from models.debt import DebtContract, DebtContractStatus
from models.debt_event import DebtEvent, EventType
from models.notification import NotificationType
from models.penalty_rule import PenaltyTrigger
from models.user import User, UserRole, UserStatus
from services.notifications.notify import notify
from services.penalty.engine import apply_penalty
from utils.finance import period_rate
from utils.ledger import apply_event_and_recompute
from utils.periods import current_period_index
from utils.rolling import days_late

log = structlog.get_logger()


def _now_utc() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


@dataclass
class CronRunResult:
    run_id: UUID
    started_at: datetime
    finished_at: datetime | None
    dry_run: bool
    summary: dict[str, int]
    errors: list[dict[str, str]]
    duration_ms: int | None

    @property
    def id(self) -> UUID:
        # Exposed so the @audit decorator can pick up entity_id from result.id.
        return self.run_id


class CronController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._event_dao = DebtEventDao(session)
        self._rolling_dao = RollingTributeDao(session)

    async def run_daily(
        self,
        dry_run: bool = False,
        triggered_by_user_id: UUID | None = None,
    ) -> CronRunResult:
        """Execute (or preview) the daily rolling + contract tick job.

        When dry_run=True the mutating work runs inside a savepoint that is
        rolled back immediately, so no side-effects persist. The CronRun record
        itself is created outside the savepoint and always persists.
        """
        dao = CronRunDao(self._session)
        cron_run = await dao.create_started(
            dry_run=dry_run, triggered_by_user_id=triggered_by_user_id
        )
        await self._session.flush()

        now = _now_utc()
        subs = await self._load_active_subs()
        processed_rolling = 0
        processed_contracts = 0
        errors: list[dict[str, str]] = []

        # Use a SAVEPOINT so dry-run mutations are never committed.
        # begin_nested() is supported by AsyncSession via asyncpg's savepoint protocol.
        async with self._session.begin_nested() as sp:
            for sub in subs:
                try:
                    processed_rolling += await self._process_rolling(sub.id, now)
                except Exception as exc:
                    errors.append({"sub_id": str(sub.id), "phase": "rolling", "message": str(exc)})
                try:
                    processed_contracts += await self._process_contracts(sub.id, now)
                except Exception as exc:
                    errors.append(
                        {"sub_id": str(sub.id), "phase": "contracts", "message": str(exc)}
                    )

            if dry_run:
                # Discard all mutations inside this savepoint; CronRun row persists.
                await sp.rollback()

        summary = {
            "subs": len(subs),
            "rolling": processed_rolling,
            "contracts": processed_contracts,
        }

        finished = await dao.finish(cron_run.id, summary_json=summary, errors=errors)
        return CronRunResult(
            run_id=cron_run.id,
            started_at=cron_run.started_at,
            finished_at=finished.finished_at,
            dry_run=dry_run,
            summary=summary,
            errors=errors,
            duration_ms=finished.duration_ms,
        )

    async def get_run(self, run_id: UUID) -> CronRun | None:
        """Return a single CronRun row by id, or None."""
        return await CronRunDao(self._session).get_by_id(run_id)

    async def validate_apply_preconditions(
        self,
        last_dry_run_id: UUID,
        requesting_user_id: UUID,
    ) -> None:
        """Raise ConflictError if the referenced dry-run cannot be used to confirm an apply.

        Rules:
        - Row must exist.
        - Must have dry_run=True.
        - Must have been triggered by the same admin.
        - Must have started within the last 5 minutes.
        """
        row = await CronRunDao(self._session).get_by_id(last_dry_run_id)
        if row is None:
            raise Conflict("Dry-run record not found.")
        if not row.dry_run:
            raise Conflict("Referenced run is not a dry-run.")
        if row.triggered_by_user_id != requesting_user_id:
            raise Conflict("Dry-run was triggered by a different admin.")
        age_seconds = (_now_utc() - row.started_at).total_seconds()
        if age_seconds > 300:
            raise Conflict("Dry-run is older than 5 minutes; please re-run.")

    async def list_runs(self, limit: int = 50) -> list[CronRun]:
        """Return recent CronRun rows for the admin history view."""
        return await CronRunDao(self._session).list_recent(limit=limit)

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
            await notify(
                self._session,
                sub_id,
                NotificationType.rolling_late,
                title="Rolling tribute overdue",
                body=f"Your rolling tribute is {late} day(s) late.",
                link="/sub",
                payload={"days_late": late},
            )
            # default_delta=0 ⇒ no-op unless a penalty_rule is configured for
            # this goddess/sub; cooldown prevents double-firing on repeated runs.
            await apply_penalty(
                self._session,
                goddess_id=rolling.goddess_id,
                sub_id=sub_id,
                trigger=PenaltyTrigger.rolling_late,
                source_kind="rolling_late",
                source_id=rolling.id,
                default_delta=0,
            )
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
            await notify(
                self._session,
                contract.sub_id,
                NotificationType.contract_late_penalty,
                title="Late payment penalty",
                body="You missed the minimum payment; a late penalty has been applied.",
                link=f"/debts/{contract.id}",
                payload={"contract_id": str(contract.id), "period_index": prev_idx},
            )
            # default_delta=0 ⇒ merit ledger stays untouched unless a penalty_rule
            # is configured; cooldown prevents double-firing across cron retries.
            await apply_penalty(
                self._session,
                goddess_id=contract.goddess_id,
                sub_id=contract.sub_id,
                trigger=PenaltyTrigger.contract_missed,
                source_kind="contract_miss",
                source_id=contract.id,
                default_delta=0,
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
        await notify(
            self._session,
            contract.sub_id,
            NotificationType.contract_period_interest,
            title="Period interest accrued",
            body=f"Interest for period {period_idx} has been added to your balance.",
            link=f"/debts/{contract.id}",
            payload={"contract_id": str(contract.id), "period_index": period_idx},
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
