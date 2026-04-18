from sqlalchemy.ext.asyncio import AsyncSession

from daos.gender_taxonomy_dao import GenderTaxonomyDao
from schemas.reference import GenderTaxonomyOut


class ReferenceController:
    def __init__(self, session: AsyncSession) -> None:
        self._gender_dao = GenderTaxonomyDao(session)

    async def list_genders(self) -> list[GenderTaxonomyOut]:
        """Return all gender taxonomy entries ordered by sort_order."""
        rows = await self._gender_dao.list_all()
        return [GenderTaxonomyOut.model_validate(row) for row in rows]
