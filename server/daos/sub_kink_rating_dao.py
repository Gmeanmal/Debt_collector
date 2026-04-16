from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.sub_kink_rating import KinkRating, SubKinkRating


class SubKinkRatingDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_matrix(self, sub_id: UUID) -> list[SubKinkRating]:
        """Return all kink ratings for a sub, ordered by item_id."""
        result = await self._session.execute(
            select(SubKinkRating)
            .where(col(SubKinkRating.sub_id) == sub_id)
            .order_by(col(SubKinkRating.item_id).asc())
        )
        return list(result.scalars().all())

    async def upsert(
        self,
        *,
        sub_id: UUID,
        goddess_id: UUID,
        item_id: UUID,
        rating: KinkRating,
        note: str | None = None,
    ) -> SubKinkRating:
        """Insert or update a sub's rating for a single kink item."""
        result = await self._session.execute(
            select(SubKinkRating).where(
                col(SubKinkRating.sub_id) == sub_id,
                col(SubKinkRating.item_id) == item_id,
            )
        )
        row = result.scalar_one_or_none()
        now = datetime.now(UTC).replace(tzinfo=None)

        if row is None:
            row = SubKinkRating(
                sub_id=sub_id,
                goddess_id=goddess_id,
                item_id=item_id,
                rating=rating,
                note=note,
            )
            self._session.add(row)
        else:
            row.rating = rating
            row.note = note
            row.updated_at = now
            self._session.add(row)

        await self._session.flush()
        return row
