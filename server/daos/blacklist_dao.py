from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.blacklist import BlacklistEntry


class BlacklistDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, entry: BlacklistEntry) -> BlacklistEntry:
        self._session.add(entry)
        await self._session.flush()
        return entry

    async def get_by_id(self, entry_id: UUID) -> BlacklistEntry | None:
        return await self._session.get(BlacklistEntry, entry_id)

    async def list_for_goddess(self, goddess_id: UUID) -> list[BlacklistEntry]:
        result = await self._session.execute(
            select(BlacklistEntry)
            .where(col(BlacklistEntry.goddess_id) == goddess_id)
            .order_by(col(BlacklistEntry.breached_at).desc())
        )
        return list(result.scalars().all())

    async def forgive(self, entry: BlacklistEntry, fee: Decimal, now: datetime) -> BlacklistEntry:
        entry.forgiven_at = now
        entry.reinstatement_fee_paid = fee
        self._session.add(entry)
        await self._session.flush()
        return entry
