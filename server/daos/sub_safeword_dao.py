from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.sub_safeword import SubSafeword


class SubSafewordDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_for_sub(self, sub_id: UUID) -> SubSafeword | None:
        """Return the safeword record for the given sub, or None if not set."""
        return await self._session.get(SubSafeword, sub_id)

    async def upsert(
        self,
        *,
        sub_id: UUID,
        goddess_id: UUID,
        word: str,
        signal: str | None,
        emergency_contact_name: str | None,
        emergency_contact_phone: str | None,
    ) -> SubSafeword:
        """Insert or update the safeword record for the given sub."""
        existing = await self._session.get(SubSafeword, sub_id)
        if existing is not None:
            existing.goddess_id = goddess_id
            existing.word = word
            existing.signal = signal
            existing.emergency_contact_name = emergency_contact_name
            existing.emergency_contact_phone = emergency_contact_phone
            existing.updated_at = datetime.now(UTC).replace(tzinfo=None)
            self._session.add(existing)
            return existing

        record = SubSafeword(
            sub_id=sub_id,
            goddess_id=goddess_id,
            word=word,
            signal=signal,
            emergency_contact_name=emergency_contact_name,
            emergency_contact_phone=emergency_contact_phone,
        )
        self._session.add(record)
        return record
