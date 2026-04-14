import datetime
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from controllers._goddess import resolve_goddess_id
from daos.goddess_views_dao import GoddessViewsDao
from models.rolling import RollingTribute
from models.user import User, UserRole, UserStatus
from schemas.goddess_views import LateSubItem, WeeklyPaymentBucket
from utils.rolling import amount_due as rolling_amount_due
from utils.rolling import days_late as rolling_days_late

LONDON = ZoneInfo("Europe/London")


def _now_utc() -> datetime.datetime:
    return datetime.datetime.now(datetime.UTC).replace(tzinfo=None)


def _display_name(user: User) -> str | None:
    parts = [p for p in (user.first_name, user.last_name) if p]
    if parts:
        return " ".join(parts)
    return user.username


class GoddessViewsController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = GoddessViewsDao(session)

    async def weekly_payments(self, goddess_user: User) -> list[WeeklyPaymentBucket]:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        buckets = await self._dao.weekly_payment_buckets(goddess_id)
        return [
            WeeklyPaymentBucket(
                week_start=week_start,
                week_end=week_end,
                total=total,
                count=count,
            )
            for week_start, week_end, total, count in buckets
        ]

    async def late_subs(self, goddess_user: User) -> list[LateSubItem]:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)

        subs = await self._load_active_subs(goddess_id)
        if not subs:
            return []

        sub_ids = [s.id for s in subs]
        subs_by_id: dict[UUID, User] = {s.id: s for s in subs}

        rollings = await self._load_rollings(sub_ids)
        last_payments = await self._dao.last_validated_payment_per_sub(sub_ids, goddess_id)

        now = _now_utc()
        items: list[LateSubItem] = []

        for rolling in rollings:
            if rolling.paused or Decimal(str(rolling.amount)) == 0:
                continue
            late = rolling_days_late(rolling, now)
            if late <= 0:
                continue
            sub = subs_by_id.get(rolling.sub_id)
            if sub is None:
                continue
            items.append(
                LateSubItem(
                    sub_id=sub.id,
                    display_name=_display_name(sub),
                    days_late=late,
                    overdue_amount=rolling_amount_due(rolling, now),
                    last_payment_at=last_payments.get(sub.id),
                )
            )

        items.sort(key=lambda it: it.days_late, reverse=True)
        return items

    async def _load_active_subs(self, goddess_id: UUID) -> list[User]:
        result = await self._session.execute(
            select(User).where(
                col(User.goddess_id) == goddess_id,
                col(User.role) == UserRole.sub,
                col(User.status) == UserStatus.active,
            )
        )
        return list(result.scalars().all())

    async def _load_rollings(self, sub_ids: list[UUID]) -> list[RollingTribute]:
        if not sub_ids:
            return []
        result = await self._session.execute(
            select(RollingTribute).where(col(RollingTribute.sub_id).in_(sub_ids))
        )
        return list(result.scalars().all())
