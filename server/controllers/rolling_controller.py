import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from controllers._goddess import resolve_goddess_id
from core.exceptions import NotFound
from daos.rolling_dao import RollingTributeDao
from models.rolling import RollingTribute
from models.user import User
from schemas.rolling import RollingTributeIn, RollingTributeOut
from utils.rolling import amount_due as calc_amount_due
from utils.rolling import current_cycle_deadline
from utils.rolling import days_late as calc_days_late


def _to_out(record: RollingTribute, now: datetime.datetime) -> RollingTributeOut:
    return RollingTributeOut(
        id=record.id,
        sub_id=record.sub_id,
        amount=Decimal(str(record.amount)),
        deadline_day=record.deadline_day,
        deadline_time=record.deadline_time,
        late_multiplier_per_day=record.late_multiplier_per_day,
        paused=record.paused,
        notes=record.notes,
        last_paid_at=record.last_paid_at,
        current_cycle_deadline=current_cycle_deadline(record, now).replace(tzinfo=datetime.UTC),
        amount_due=calc_amount_due(record, now),
        days_late=calc_days_late(record, now),
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


async def _assert_sub_belongs_to_goddess(
    session: AsyncSession, goddess_id: UUID, sub_id: UUID
) -> None:
    result = await session.execute(
        select(User).where(
            col(User.id) == sub_id,
            col(User.goddess_id) == goddess_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise NotFound("sub not found or not linked to this goddess")


class RollingController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = RollingTributeDao(session)

    async def get_for_sub_by_goddess(
        self, goddess_user: User, sub_id: UUID
    ) -> RollingTributeOut | None:
        """Return the rolling tribute for a sub, or None if none configured."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        await _assert_sub_belongs_to_goddess(self._session, goddess_id, sub_id)
        record = await self._dao.get_for_sub(sub_id)
        if record is None:
            return None
        now = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        return _to_out(record, now)

    async def upsert_for_sub(
        self, goddess_user: User, sub_id: UUID, payload: RollingTributeIn
    ) -> RollingTributeOut:
        """Create or update the rolling tribute for a sub."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        await _assert_sub_belongs_to_goddess(self._session, goddess_id, sub_id)
        record = await self._dao.upsert(sub_id, payload)
        now = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        return _to_out(record, now)

    async def clear_for_sub(self, goddess_user: User, sub_id: UUID) -> None:
        """Disable the rolling tribute by setting amount=0 and paused=True."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        await _assert_sub_belongs_to_goddess(self._session, goddess_id, sub_id)
        record = await self._dao.get_for_sub(sub_id)
        if record is None:
            raise NotFound("no rolling tribute configured for this sub")
        clear_payload = RollingTributeIn(
            amount=Decimal("0"),
            deadline_day=record.deadline_day,
            deadline_time=record.deadline_time,
            late_multiplier_per_day=record.late_multiplier_per_day,
            paused=True,
            notes=record.notes,
        )
        await self._dao.upsert(sub_id, clear_payload)
