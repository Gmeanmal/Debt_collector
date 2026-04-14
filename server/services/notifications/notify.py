from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from daos.notification_dao import NotificationDao
from models.notification import Notification, NotificationType
from services.notifications.publisher import publisher


async def notify(
    session: AsyncSession,
    user_id: UUID,
    type: NotificationType,
    title: str,
    body: str | None = None,
    link: str | None = None,
    payload: dict[str, Any] | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        link=link,
        payload=payload,
    )
    notification = await NotificationDao(session).create(notification)

    ws_payload: dict[str, Any] = {
        "id": str(notification.id),
        "type": notification.type.value,
        "title": notification.title,
        "body": notification.body,
        "link": notification.link,
        "payload": notification.payload,
        "created_at": notification.created_at.isoformat(),
    }
    await publisher.publish(user_id, ws_payload)
    return notification
