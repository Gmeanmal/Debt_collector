from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.goddess_kek import GoddessKek


class GoddessKekNotFoundError(Exception):
    pass


class GoddessKekDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_goddess(self, goddess_id: UUID) -> GoddessKek:
        """Return the KEK row for the given goddess, or raise GoddessKekNotFoundError."""
        result = await self._session.execute(
            select(GoddessKek).where(col(GoddessKek.goddess_id) == goddess_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise GoddessKekNotFoundError(goddess_id)
        return row

    async def create(
        self,
        goddess_id: UUID,
        wrapped_dek: bytes,
        nonce: bytes,
        root_kek_version: int,
    ) -> GoddessKek:
        """Persist a new KEK row and return it."""
        kek = GoddessKek(
            goddess_id=goddess_id,
            wrapped_dek=wrapped_dek,
            nonce=nonce,
            root_kek_version=root_kek_version,
        )
        self._session.add(kek)
        await self._session.flush()
        return kek

    async def rotate(
        self,
        kek: GoddessKek,
        wrapped_dek: bytes,
        nonce: bytes,
        root_kek_version: int,
    ) -> GoddessKek:
        """Overwrite wrapped material and stamp rotated_at."""
        kek.wrapped_dek = wrapped_dek
        kek.nonce = nonce
        kek.root_kek_version = root_kek_version
        kek.rotated_at = datetime.now(UTC)
        self._session.add(kek)
        await self._session.flush()
        return kek
