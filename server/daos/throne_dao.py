from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.throne_connection import ThroneConnection


class ThroneDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_goddess(self, goddess_id: UUID) -> ThroneConnection | None:
        """Return the Throne connection for the given goddess, or None if unset."""
        return await self._session.get(ThroneConnection, goddess_id)

    async def upsert(
        self,
        *,
        goddess_id: UUID,
        account_id: str,
        access_token_enc: bytes,
        access_token_last4: str,
        dek_version: int = 1,
    ) -> ThroneConnection:
        """Insert or update the Throne connection row for the given goddess."""
        existing = await self._session.get(ThroneConnection, goddess_id)
        if existing is not None:
            existing.account_id = account_id
            existing.access_token_enc = access_token_enc
            existing.access_token_last4 = access_token_last4
            existing.dek_version = dek_version
            existing.updated_at = datetime.now(UTC).replace(tzinfo=None)
            self._session.add(existing)
            await self._session.flush()
            return existing

        record = ThroneConnection(
            goddess_id=goddess_id,
            account_id=account_id,
            access_token_enc=access_token_enc,
            access_token_last4=access_token_last4,
            dek_version=dek_version,
        )
        self._session.add(record)
        await self._session.flush()
        return record
