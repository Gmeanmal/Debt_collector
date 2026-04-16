from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from core.exceptions import Forbidden, NotFound
from daos.tribute_minimum_dao import TributeMinimumDao
from daos.user_dao import UserDao
from models.tribute_minimum import TributePeriod
from models.user import User
from schemas.tribute_minimum import TributeGaugeOut, TributeMinimumOut, TributeMinimumUpsertIn

_LONDON = ZoneInfo("Europe/London")


def _current_period_bounds(period: TributePeriod) -> tuple[datetime, datetime]:
    """Return (start, end) as UTC-naive datetimes for the current London period."""
    now_london = datetime.now(_LONDON)

    if period == TributePeriod.weekly:
        monday = now_london - timedelta(days=now_london.weekday())
        start_london = monday.replace(hour=0, minute=0, second=0, microsecond=0)
        end_london = start_london + timedelta(weeks=1)
    else:
        start_london = now_london.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if start_london.month == 12:
            end_london = start_london.replace(year=start_london.year + 1, month=1)
        else:
            end_london = start_london.replace(month=start_london.month + 1)

    start_utc = start_london.astimezone(UTC).replace(tzinfo=None)
    end_utc = end_london.astimezone(UTC).replace(tzinfo=None)
    return start_utc, end_utc


def _compute_color(ratio: Decimal | None, grace_below_percent: Decimal) -> str:
    if ratio is None:
        return "green"
    if ratio < grace_below_percent:
        return "red"
    if ratio < Decimal("1"):
        return "amber"
    return "green"


class TributeMinimumController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = TributeMinimumDao(session)
        self._user_dao = UserDao(session)

    async def _resolve_goddess_and_verify_sub(self, goddess_user: User, sub_id: UUID) -> UUID:
        """Return goddess_id after verifying the sub belongs to this goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        sub = await self._user_dao.get_by_id(sub_id)
        if sub is None or sub.goddess_id != goddess_id:
            raise Forbidden("sub not found or not linked to this goddess")
        return goddess_id

    async def upsert(
        self, goddess_user: User, sub_id: UUID, payload: TributeMinimumUpsertIn
    ) -> tuple[TributeMinimumOut, bool]:
        """Upsert the tribute minimum for a sub.

        Returns (output, created) where created=True on first write.
        """
        goddess_id = await self._resolve_goddess_and_verify_sub(goddess_user, sub_id)
        row, created = await self._dao.upsert(
            sub_id=sub_id,
            goddess_id=goddess_id,
            amount=payload.amount,
            period=payload.period,
            grace_below_percent=payload.grace_below_percent,
        )
        return TributeMinimumOut.model_validate(row), created

    async def get(self, goddess_user: User, sub_id: UUID) -> TributeMinimumOut:
        """Return the tribute minimum config for a sub.

        Raises NotFound if no config exists.
        """
        await self._resolve_goddess_and_verify_sub(goddess_user, sub_id)
        row = await self._dao.get_for_sub(sub_id)
        if row is None:
            raise NotFound("tribute_minimum not configured for this sub")
        return TributeMinimumOut.model_validate(row)

    async def delete(self, goddess_user: User, sub_id: UUID) -> None:
        """Delete the tribute minimum config for a sub."""
        await self._resolve_goddess_and_verify_sub(goddess_user, sub_id)
        await self._dao.delete(sub_id)

    async def gauge(self, goddess_user: User, sub_id: UUID) -> TributeGaugeOut:
        """Return the performance gauge for a sub's tribute minimum.

        When not configured, falls back to a monthly window and returns
        configured=False with color=green and null target fields.
        """
        goddess_id = await self._resolve_goddess_and_verify_sub(goddess_user, sub_id)
        row = await self._dao.get_for_sub(sub_id)

        if row is not None:
            period = row.period
            target_amount = Decimal(str(row.amount))
            grace = Decimal(str(row.grace_below_percent))
        else:
            period = TributePeriod.monthly
            target_amount = None
            grace = Decimal("0.80")

        period_start, period_end = _current_period_bounds(period)
        actual = await self._dao.sum_validated_for_period(
            sub_id, goddess_id, period_start, period_end
        )

        ratio: Decimal | None = None
        if target_amount is not None and target_amount > Decimal("0"):
            ratio = (actual / target_amount).quantize(Decimal("0.0001"))

        color = _compute_color(ratio, grace)

        return TributeGaugeOut(
            configured=row is not None,
            target_amount=target_amount,
            period=period if row is not None else None,
            actual_this_period=actual,
            ratio=ratio,
            color=color,
            period_start=period_start,
            period_end=period_end,
        )
