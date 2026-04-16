from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from models.sub_medical import SubMedical


class SubMedicalDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, sub_id: UUID) -> SubMedical | None:
        """Return the medical record for the given sub, or None if it does not exist."""
        return await self._session.get(SubMedical, sub_id)

    async def upsert(
        self,
        sub_id: UUID,
        goddess_id: UUID,
        fields: dict[str, bytes | None],
    ) -> SubMedical:
        """Insert or update the medical record for a sub.

        Only keys present in `fields` are written to the conflict-update set.
        `updated_at` is always bumped. `goddess_id` is set on insert only.
        """
        now = datetime.now(UTC).replace(tzinfo=None)
        insert_values: dict[str, object] = {
            "sub_id": sub_id,
            "goddess_id": goddess_id,
            "updated_at": now,
            **fields,
        }
        update_values: dict[str, object] = {"updated_at": now, **fields}

        stmt = (
            pg_insert(SubMedical)
            .values(**insert_values)
            .on_conflict_do_update(index_elements=["sub_id"], set_=update_values)
            .returning(SubMedical)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one()
