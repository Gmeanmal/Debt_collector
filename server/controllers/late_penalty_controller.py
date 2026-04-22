"""Bulk-apply default late penalty to a set of late contracts.

Fires the same pair of side-effects the daily cron fires for a missed period:
1. ``DebtEvent(late_penalty)`` with the contract's ``late_penalty_percent``
   (idempotent — skipped if one already exists for the current period).
2. ``apply_penalty`` — consults the penalty engine so merits/cooldowns stay
   consistent with the cron code path.

Contracts that are not late (period unpaid and past the period start), not
owned by the goddess, or already have a late_penalty event for the current
period are reported under the matching counter and skipped without error.
"""

from __future__ import annotations

import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from controllers.dashboard.helpers import period_start
from daos.debt_dao import DebtContractDao
from daos.debt_event_dao import DebtEventDao
from models.debt import DebtContract, DebtContractStatus
from models.debt_event import DebtEvent, EventType
from models.penalty_rule import PenaltyTrigger
from models.user import User
from services.notifications.notify import notify
from services.penalty.engine import apply_penalty
from utils.ledger import apply_event_and_recompute
from utils.periods import current_period_index


class BulkApplyLatePenaltyIn(BaseModel):
    contract_ids: list[UUID] = Field(
        ...,
        description="Contracts to consider for penalty application",
        min_length=1,
        max_length=50,
        examples=[["b3e1c2d4-0000-0000-0000-000000000001"]],
    )


class BulkApplyLatePenaltySummary(BaseModel):
    applied: int = Field(..., description="Contracts where a new late_penalty event was written")
    already_penalised: int = Field(
        ...,
        description="Contracts where a late_penalty event already existed for the current period",
    )
    not_late: int = Field(
        ...,
        description="Contracts that are active but not currently late (no penalty fired)",
    )
    not_found: int = Field(
        ...,
        description="Contract ids not owned by this goddess or not in `active` status",
    )
    applied_contract_ids: list[UUID] = Field(
        default_factory=list,
        description="Subset of input ids that actually received a penalty event",
    )


class LatePenaltyController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._contract_dao = DebtContractDao(session)
        self._event_dao = DebtEventDao(session)

    async def bulk_apply(
        self,
        goddess_user: User,
        contract_ids: list[UUID],
    ) -> BulkApplyLatePenaltySummary:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        now = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)

        applied = 0
        already = 0
        not_late = 0
        not_found = 0
        applied_ids: list[UUID] = []

        seen: set[UUID] = set()
        for cid in contract_ids:
            if cid in seen:
                continue
            seen.add(cid)

            contract: DebtContract | None = await self._contract_dao.get_by_id(cid)
            if (
                contract is None
                or contract.goddess_id != goddess_id
                or contract.status != DebtContractStatus.active
                or contract.signed_at is None
            ):
                not_found += 1
                continue

            p_start = period_start(contract, now)
            if p_start is None or (now.date() - p_start.date()).days <= 0:
                not_late += 1
                continue

            period_idx = current_period_index(contract, now)
            paid = await self._event_dao.exists_for_period(
                contract.id, period_idx, EventType.payment_applied
            )
            if paid:
                not_late += 1
                continue

            if await self._event_dao.exists_for_period(
                contract.id, period_idx, EventType.late_penalty
            ):
                already += 1
                continue

            await apply_event_and_recompute(
                self._session,
                DebtEvent(
                    contract_id=contract.id,
                    event_type=EventType.late_penalty,
                    amount=Decimal(str(contract.late_penalty_percent)),
                    period_index=period_idx,
                    note="goddess-triggered bulk late penalty",
                ),
            )

            await notify(
                self._session,
                contract.sub_id,
                _LATE_NOTIFY_KIND,
                title="Late payment penalty",
                body=(
                    "Your goddess applied the late penalty "
                    "for this period's missed minimum payment."
                ),
                link=f"/sub/debts/{contract.slug}" if contract.slug else "/sub/debts",
                payload={"contract_id": str(contract.id), "period_index": period_idx},
            )

            await apply_penalty(
                self._session,
                goddess_id=goddess_id,
                sub_id=contract.sub_id,
                trigger=PenaltyTrigger.contract_missed,
                source_kind="contract_miss",
                source_id=contract.id,
                default_delta=0,
            )

            applied += 1
            applied_ids.append(contract.id)

        return BulkApplyLatePenaltySummary(
            applied=applied,
            already_penalised=already,
            not_late=not_late,
            not_found=not_found,
            applied_contract_ids=applied_ids,
        )


# Import kept local so module-level import of the controller doesn't drag the
# full notification enum graph into router load time.
from models.notification import NotificationType as _NotifEnum  # noqa: E402

_LATE_NOTIFY_KIND = _NotifEnum.contract_late_penalty
