from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from daos.sub_aftercare_dao import SubAftercareDao
from models.user import User
from schemas.sub_aftercare import SubAftercareOut, SubAftercareUpdate


class SubAftercareController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = SubAftercareDao(session)

    async def get_own(self, caller: User) -> SubAftercareOut:
        row = await self._dao.get(caller.id)
        if row is None:
            return SubAftercareOut(
                sub_id=caller.id,
                needs=None,
                comfort_items=None,
                contact_phrase=None,
                notes=None,
                updated_at=datetime.now(UTC).replace(tzinfo=None),
            )
        return SubAftercareOut.model_validate(row)

    async def upsert_own(self, caller: User, body: SubAftercareUpdate) -> SubAftercareOut:
        fields: dict[str, str | None] = {}  # only string nullable fields here
        if body.needs is not None:
            fields["needs"] = body.needs
        if body.comfort_items is not None:
            fields["comfort_items"] = body.comfort_items
        if body.contact_phrase is not None:
            fields["contact_phrase"] = body.contact_phrase
        if body.notes is not None:
            fields["notes"] = body.notes

        row = await self._dao.upsert(caller.id, fields)
        return SubAftercareOut.model_validate(row)
