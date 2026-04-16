from datetime import UTC, datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.sub_kink_rating import KinkRating, SubKinkRating
from models.user import User


class SubKinkRatingDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def count_ratings_per_item_for_goddess(
        self, goddess_id: UUID
    ) -> list[tuple[UUID, KinkRating, int]]:
        """Return (item_id, rating, count) grouped rows for all subs of a goddess.

        Only explicit ratings in sub_kink_rating are counted; the not_set default
        is inferred by the controller when building the dense overview.
        """
        stmt = (
            sa.select(
                col(SubKinkRating.item_id),
                col(SubKinkRating.rating),
                sa.func.count().label("cnt"),
            )
            .join(User, col(SubKinkRating.sub_id) == col(User.id))
            .where(col(SubKinkRating.goddess_id) == goddess_id)
            .group_by(col(SubKinkRating.item_id), col(SubKinkRating.rating))
        )
        result = await self._session.execute(stmt)
        return [(row.item_id, row.rating, row.cnt) for row in result.all()]

    async def count_subs_for_goddess(self, goddess_id: UUID) -> int:
        """Return the total number of active subs assigned to the goddess."""
        stmt = sa.select(sa.func.count()).where(col(User.goddess_id) == goddess_id)
        result = await self._session.execute(stmt)
        return result.scalar_one()

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
