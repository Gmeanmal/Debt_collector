from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFound
from daos.push_subscription_dao import PushSubscriptionDao
from models.push_subscription import PushSubscription
from models.user import User
from schemas.notification import PushSubscriptionIn


class PushSubscriptionController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = PushSubscriptionDao(session)

    async def create(
        self,
        user: User,
        payload: PushSubscriptionIn,
        user_agent: str | None,
    ) -> PushSubscription:
        """Register or refresh a Web Push subscription for the authenticated user."""
        sub = PushSubscription(
            user_id=user.id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
            user_agent=user_agent,
        )
        return await self._dao.create(sub)

    async def list_for_user(self, user: User) -> list[PushSubscription]:
        """Return every active push subscription owned by the authenticated user."""
        return await self._dao.list_for_user(user.id)

    async def delete(self, user: User, sub_id: UUID) -> None:
        """Delete a push subscription owned by the authenticated user. 404 if not found."""
        deleted = await self._dao.delete_for_user(sub_id, user.id)
        if not deleted:
            raise NotFound("push subscription not found")
