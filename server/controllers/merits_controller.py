from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from core.exceptions import Forbidden, NotFound
from daos.merit_event_dao import MeritEventDao
from daos.user_dao import UserDao
from models.user import User, UserRole
from schemas.merits import PointsBalanceOut


class MeritsController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = MeritEventDao(session)
        self._user_dao = UserDao(session)

    async def get_balance_for_sub_self(self, user: User) -> PointsBalanceOut:
        """Return the merit points balance for the authenticated sub."""
        if user.goddess_id is None:
            raise Forbidden("sub has no assigned goddess")
        balance, last_event_at, event_count = await self._dao.balance_for_sub(
            user.id, user.goddess_id
        )
        return PointsBalanceOut(
            balance=balance,
            last_event_at=last_event_at,
            event_count=event_count,
        )

    async def get_balance_for_goddess_scoped(
        self, goddess_user: User, sub_id: UUID
    ) -> PointsBalanceOut:
        """Return the merit points balance for a sub, visible to the authenticated goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        sub = await self._user_dao.get_by_id(sub_id)
        if sub is None or sub.role != UserRole.sub:
            raise NotFound("sub not found")
        if sub.goddess_id != goddess_id:
            raise Forbidden("sub does not belong to this goddess")
        balance, last_event_at, event_count = await self._dao.balance_for_sub(sub_id, goddess_id)
        return PointsBalanceOut(
            balance=balance,
            last_event_at=last_event_at,
            event_count=event_count,
        )
