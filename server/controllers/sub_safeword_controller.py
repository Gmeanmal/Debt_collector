from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from core.exceptions import Forbidden, NotFound
from daos.sub_safeword_dao import SubSafewordDao
from daos.user_dao import UserDao
from models.user import Goddess, User
from schemas.safeword import SubSafewordIn, SubSafewordOut
from utils.placeholder_guard import reject_if_placeholder


def _to_out(record: object) -> SubSafewordOut:
    return SubSafewordOut.model_validate(record)


class SubSafewordController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = SubSafewordDao(session)
        self._user_dao = UserDao(session)

    async def _resolve_goddess_id(self, goddess_user_id: UUID) -> UUID:
        result = await self._session.execute(
            select(Goddess)
            .join(User, col(User.goddess_id) == col(Goddess.id))
            .where(col(User.id) == goddess_user_id)
        )
        goddess = result.scalar_one_or_none()
        if goddess is None:
            raise Forbidden("goddess profile not found for this user")
        return goddess.id

    async def get_self(self, sub_id: UUID) -> SubSafewordOut | None:
        """Return the calling sub's safeword record, or None if not yet set."""
        record = await self._dao.get_for_sub(sub_id)
        if record is None:
            return None
        return _to_out(record)

    async def upsert_self(self, sub_id: UUID, body: SubSafewordIn) -> SubSafewordOut:
        """Create or update the calling sub's safeword, resolving goddess_id from their profile."""
        reject_if_placeholder(body.word, "word")
        reject_if_placeholder(body.emergency_contact_name, "emergency_contact_name")
        reject_if_placeholder(body.emergency_contact_phone, "emergency_contact_phone")

        user = await self._user_dao.get_by_id(sub_id)
        if user is None or user.goddess_id is None:
            raise Forbidden("sub is not assigned to a goddess")
        record = await self._dao.upsert(
            sub_id=sub_id,
            goddess_id=user.goddess_id,
            word=body.word,
            signal=body.signal,
            emergency_contact_name=body.emergency_contact_name,
            emergency_contact_phone=body.emergency_contact_phone,
        )
        return _to_out(record)

    async def get_for_goddess(self, goddess_user_id: UUID, sub_id: UUID) -> SubSafewordOut | None:
        """Return a sub's safeword; raises 403 if the sub does not belong to this goddess."""
        goddess_id = await self._resolve_goddess_id(goddess_user_id)
        user = await self._user_dao.get_by_id(sub_id)
        if user is None:
            raise NotFound("sub not found")
        if user.goddess_id != goddess_id:
            raise Forbidden("sub does not belong to this goddess")
        record = await self._dao.get_for_sub(sub_id)
        if record is None:
            return None
        return _to_out(record)
