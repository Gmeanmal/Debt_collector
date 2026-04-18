from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from core.exceptions import NotFound
from daos.sub_aftercare_dao import AftercareFields, SubAftercareDao
from daos.user_dao import UserDao
from models.user import User
from schemas.sub_aftercare import SubAftercareOut, SubAftercareUpdate


class SubAftercareController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = SubAftercareDao(session)
        self._user_dao = UserDao(session)

    async def get_own(self, caller: User) -> SubAftercareOut:
        """Return the authenticated sub's aftercare profile, or a default empty document."""
        row = await self._dao.get(caller.id)
        if row is None:
            return SubAftercareOut(
                sub_id=caller.id,
                needs=None,
                comfort_items=None,
                contact_phrase=None,
                notes=None,
                intensity=3,
                read_by_goddess_at=None,
                updated_at=datetime.now(UTC).replace(tzinfo=None),
            )
        return SubAftercareOut.model_validate(row)

    async def upsert_own(self, caller: User, body: SubAftercareUpdate) -> SubAftercareOut:
        """Create or fully replace the authenticated sub's aftercare profile."""
        fields: AftercareFields = {}
        if body.needs is not None:
            fields["needs"] = body.needs
        if body.comfort_items is not None:
            fields["comfort_items"] = body.comfort_items
        if body.contact_phrase is not None:
            fields["contact_phrase"] = body.contact_phrase
        if body.notes is not None:
            fields["notes"] = body.notes
        if body.intensity is not None:
            fields["intensity"] = body.intensity

        row = await self._dao.upsert(caller.id, fields)
        return SubAftercareOut.model_validate(row)

    async def get_for_goddess(self, goddess_user: User, sub_username: str) -> SubAftercareOut:
        """Return the sub's aftercare profile for the goddess. Raises NotFound if not owned."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        sub = await self._user_dao.get_by_username(sub_username)
        if sub is None or sub.goddess_id != goddess_id:
            raise NotFound("sub not found")
        row = await self._dao.get(sub.id)
        if row is None:
            return SubAftercareOut(
                sub_id=sub.id,
                needs=None,
                comfort_items=None,
                contact_phrase=None,
                notes=None,
                intensity=3,
                read_by_goddess_at=None,
                updated_at=datetime.now(UTC).replace(tzinfo=None),
            )
        return SubAftercareOut.model_validate(row)

    async def mark_read(self, goddess_user: User, sub_username: str) -> None:
        """Stamp read_by_goddess_at on the sub's aftercare profile. Idempotent.

        Raises NotFound (not Forbidden) when the sub does not belong to this goddess
        to avoid leaking existence.
        """
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        sub = await self._user_dao.get_by_username(sub_username)
        if sub is None or sub.goddess_id != goddess_id:
            raise NotFound("sub not found")
        await self._dao.mark_read_if_unset(sub.id, goddess_id)
        await self._session.flush()
