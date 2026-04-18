from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFound
from models.sub_aftercare import SubAftercare

AftercareFields = dict[str, str | int | None]


class SubAftercareDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, sub_id: UUID) -> SubAftercare | None:
        """Return the aftercare record for the given sub, or None if not found."""
        return await self._session.get(SubAftercare, sub_id)

    async def upsert(self, sub_id: UUID, fields: AftercareFields) -> SubAftercare:
        """Create or update the aftercare record for the given sub."""
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

    async def mark_read_if_unset(self, sub_id: UUID, goddess_id: UUID) -> SubAftercare:
        """Stamp read_by_goddess_at to now if not already set. Idempotent.

        Raises NotFound when no aftercare record exists for sub_id — the goddess_id
        parameter is accepted for API symmetry with the journal pattern but ownership
        is validated by the controller before this method is called.
        """
        row = await self._session.get(SubAftercare, sub_id)
        if row is None:
            raise NotFound(f"aftercare record for sub {sub_id} not found")
        if row.read_by_goddess_at is None:
            row.read_by_goddess_at = datetime.now(UTC).replace(tzinfo=None)
            self._session.add(row)
        return row
