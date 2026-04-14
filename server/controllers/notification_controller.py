from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from daos.notification_dao import NotificationDao
from models.notification import Notification, NotificationType
from models.user import User
from schemas.notification import NotificationListOut, NotificationOut
from services.notifications.notify import notify


class NotificationController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = NotificationDao(session)

    async def create_and_publish(
        self,
        user_id: UUID,
        type: NotificationType,
        title: str,
        body: str | None = None,
        link: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> Notification:
        return await notify(self._session, user_id, type, title, body, link, payload)

    async def list_recent(self, user: User) -> NotificationListOut:
        rows = await self._dao.list_for_user(user.id)
        unread = await self._dao.unread_count(user.id)
        return NotificationListOut(
            items=[NotificationOut.model_validate(r) for r in rows],
            unread=unread,
        )

    async def mark_read(self, user: User, notification_id: UUID) -> None:
        await self._dao.mark_read(notification_id, user.id)

    async def unread_count(self, user: User) -> int:
        return await self._dao.unread_count(user.id)
