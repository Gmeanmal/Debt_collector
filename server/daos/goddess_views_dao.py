import datetime
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.payment import PaymentDeclaration, PaymentStatus

LONDON = ZoneInfo("Europe/London")


def _week_bounds(ref: datetime.date) -> tuple[datetime.date, datetime.date]:
    """Return (monday, sunday) of the ISO week containing ref."""
    monday = ref - datetime.timedelta(days=ref.weekday())
    sunday = monday + datetime.timedelta(days=6)
    return monday, sunday


def _eight_week_starts(today_london: datetime.date) -> list[datetime.date]:
    """Return list of 8 Monday dates: current week first, then 7 previous."""
    current_monday = today_london - datetime.timedelta(days=today_london.weekday())
    return [current_monday - datetime.timedelta(weeks=i) for i in range(8)]


class GoddessViewsDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def weekly_payment_buckets(
        self, goddess_id: UUID
    ) -> list[tuple[datetime.date, datetime.date, Decimal, int]]:
        """Return 8 week buckets (week_start, week_end, total, count).

        Buckets are ordered current week first. Uses validated_at for week
        assignment, falling back to declared_at when validated_at is null
        (though only validated payments are included so validated_at exists).
        """
        today_london = datetime.datetime.now(LONDON).date()
        week_starts = _eight_week_starts(today_london)
        oldest_monday = week_starts[-1]

        oldest_utc = datetime.datetime.combine(oldest_monday, datetime.time.min)
        current_sunday = week_starts[0] + datetime.timedelta(days=6)
        end_utc = datetime.datetime.combine(current_sunday, datetime.time(23, 59, 59))

        result = await self._session.execute(
            select(
                PaymentDeclaration.validated_at,
                PaymentDeclaration.amount,
            ).where(
                col(PaymentDeclaration.goddess_id) == goddess_id,
                col(PaymentDeclaration.status) == PaymentStatus.validated,
                col(PaymentDeclaration.validated_at) >= oldest_utc,
                col(PaymentDeclaration.validated_at) <= end_utc,
            )
        )
        rows = result.all()

        buckets: dict[datetime.date, tuple[Decimal, int]] = {
            monday: (Decimal("0"), 0) for monday in week_starts
        }

        for validated_at, amount in rows:
            if validated_at is None:
                continue
            validated_london = validated_at.replace(tzinfo=datetime.UTC).astimezone(LONDON)
            row_monday = validated_london.date() - datetime.timedelta(
                days=validated_london.weekday()
            )
            if row_monday in buckets:
                prev_total, prev_count = buckets[row_monday]
                buckets[row_monday] = (
                    prev_total + Decimal(str(amount)),
                    prev_count + 1,
                )

        return [
            (monday, monday + datetime.timedelta(days=6), total, count)
            for monday, (total, count) in sorted(buckets.items(), reverse=True)
        ]

    async def last_validated_payment_per_sub(
        self, sub_ids: list[UUID], goddess_id: UUID
    ) -> dict[UUID, datetime.datetime | None]:
        """Return {sub_id: latest validated_at} for given subs."""
        if not sub_ids:
            return {}
        result = await self._session.execute(
            select(
                PaymentDeclaration.sub_id,
                func.max(PaymentDeclaration.validated_at),
            )
            .where(
                col(PaymentDeclaration.goddess_id) == goddess_id,
                col(PaymentDeclaration.sub_id).in_(sub_ids),
                col(PaymentDeclaration.status) == PaymentStatus.validated,
            )
            .group_by(col(PaymentDeclaration.sub_id))
        )
        return {sub_id: validated_at for sub_id, validated_at in result.all()}
