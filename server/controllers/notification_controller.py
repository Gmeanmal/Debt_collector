from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from daos.notification_dao import NotificationDao
from daos.user_dao import UserDao
from models.notification import Notification, NotificationType
from models.user import User
from schemas.notification import NotificationListOut, NotificationOut
from services.notifications.notify import notify


class NotificationController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = NotificationDao(session)
        self._user_dao = UserDao(session)

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

        actor_ids = list({r.actor_user_id for r in rows if r.actor_user_id is not None})
        actor_map = await self._user_dao.get_many_by_ids(actor_ids)

        items: list[NotificationOut] = []
        for row in rows:
            actor = actor_map.get(row.actor_user_id) if row.actor_user_id else None
            out = NotificationOut.model_validate(row)
            if actor is not None:
                parts = [p for p in (actor.first_name, actor.last_name) if p]
                out.actor_display_name = " ".join(parts) if parts else actor.username
                out.actor_username = actor.username
            items.append(out)

        return NotificationListOut(items=items, unread=unread)

    async def mark_read(self, user: User, notification_id: UUID) -> None:
        await self._dao.mark_read(notification_id, user.id)

    async def mark_all_read(self, user: User) -> None:
        await self._dao.mark_all_read_for_user(user.id)

    async def unread_count(self, user: User) -> int:
        return await self._dao.unread_count(user.id)
