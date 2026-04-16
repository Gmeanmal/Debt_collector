from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from models.sub_aftercare import SubAftercare

AftercareFields = dict[str, str | None]


class SubAftercareDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, sub_id: UUID) -> SubAftercare | None:
        return await self._session.get(SubAftercare, sub_id)

    async def upsert(self, sub_id: UUID, fields: AftercareFields) -> SubAftercare:
        now = datetime.now(UTC).replace(tzinfo=None)
        insert_values: dict[str, object] = {"sub_id": sub_id, "updated_at": now, **fields}
        update_values: dict[str, object] = {**fields, "updated_at": now}

        stmt = (
            pg_insert(SubAftercare)
            .values(**insert_values)
            .on_conflict_do_update(index_elements=["sub_id"], set_=update_values)
            .returning(SubAftercare)
        )
        result = await self._session.execute(stmt)
        row = result.scalar_one()
        return row
