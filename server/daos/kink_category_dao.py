from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import NotFound
from models.kink_category import KinkCategory


class KinkCategoryDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[KinkCategory]:
        """Return all kink categories ordered by sort_order ascending."""
        result = await self._session.execute(
            select(KinkCategory).order_by(col(KinkCategory.sort_order).asc())
        )
        return list(result.scalars().all())

    async def get_by_slug(self, slug: str) -> KinkCategory:
        """Return a kink category by slug, raising NotFound if absent."""
        result = await self._session.execute(
            select(KinkCategory).where(col(KinkCategory.slug) == slug)
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise NotFound(f"kink_category '{slug}' not found")
        return row

    async def upsert_by_slug(
        self,
        *,
        slug: str,
        label: str,
        safety_flag: bool = False,
        sort_order: int = 0,
    ) -> KinkCategory:
        """Insert or update a category by slug. Used by the seed."""
        result = await self._session.execute(
            select(KinkCategory).where(col(KinkCategory.slug) == slug)
        )
        row = result.scalar_one_or_none()
        now = datetime.now(UTC).replace(tzinfo=None)
        if row is None:
            row = KinkCategory(
                slug=slug,
                label=label,
                safety_flag=safety_flag,
                sort_order=sort_order,
            )
            self._session.add(row)
        else:
            row.label = label
            row.safety_flag = safety_flag
            row.sort_order = sort_order
            row.updated_at = now
            self._session.add(row)
        await self._session.flush()
        return row

    async def get_by_id(self, category_id: UUID) -> KinkCategory:
        """Return a kink category by primary key, raising NotFound if absent."""
        row = await self._session.get(KinkCategory, category_id)
        if row is None:
            raise NotFound(f"kink_category {category_id} not found")
        return row
