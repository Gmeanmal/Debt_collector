from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from daos.goddess_kek_dao import GoddessKekDao, GoddessKekNotFoundError
from models.goddess_kek import GoddessKek
from services.crypto.root_kek import generate_dek, wrap_dek


async def ensure_goddess_kek(session: AsyncSession, goddess_id: UUID) -> GoddessKek:
    """Return the existing GoddessKek row, creating it if absent.

    Idempotent: safe to call on every request that needs the KEK.
    """
    dao = GoddessKekDao(session)
    try:
        return await dao.get_by_goddess(goddess_id)
    except GoddessKekNotFoundError:
        dek = generate_dek()
        wrapped, nonce, version = wrap_dek(dek)
        return await dao.create(
            goddess_id=goddess_id,
            wrapped_dek=wrapped,
            nonce=nonce,
            root_kek_version=version,
        )
