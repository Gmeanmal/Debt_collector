from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import NotFound
from models.gender_taxonomy import GenderTaxonomy


class GenderTaxonomyDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[GenderTaxonomy]:
        """Return all gender taxonomy entries ordered by sort_order ascending."""
        result = await self._session.execute(
            select(GenderTaxonomy).order_by(col(GenderTaxonomy.sort_order))
        )
        return list(result.scalars().all())

    async def get_by_id(self, gender_id: UUID) -> GenderTaxonomy:
        """Return a single taxonomy entry by UUID, raising NotFound if absent."""
        row = await self._session.get(GenderTaxonomy, gender_id)
        if row is None:
            raise NotFound(f"gender taxonomy entry {gender_id} not found")
        return row

    async def get_by_slug(self, slug: str) -> GenderTaxonomy | None:
        """Return a taxonomy entry by slug, or None if not found."""
        result = await self._session.execute(
            select(GenderTaxonomy).where(col(GenderTaxonomy.slug) == slug)
        )
        return result.scalar_one_or_none()
