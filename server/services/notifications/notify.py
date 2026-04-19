import asyncio
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from daos.notification_dao import NotificationDao
from daos.push_subscription_dao import PushSubscriptionDao
from models.notification import Notification, NotificationType
from models.push_subscription import PushSubscription
from services.notifications.publisher import publisher
from services.notifications.push_sender import PushSender

log = structlog.get_logger()


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
    await publisher.publish_event(user_id, "notification", ws_payload)

    await _fanout_web_push(session, user_id, notification)
    return notification


async def _fanout_web_push(
    session: AsyncSession, user_id: UUID, notification: Notification
) -> None:
    # WHY: swallow everything. notify() runs inside a controller's open transaction;
    # a raise here would poison the DB write and the WS publish we already did.
    try:
        dao = PushSubscriptionDao(session)
        subs = await dao.list_for_user(user_id)
        if not subs:
            return

        push_payload: dict[str, Any] = {
            "title": notification.title,
            "body": notification.body or "",
            "url": notification.link or "/",
        }
        sender = PushSender(get_settings())
        results = await asyncio.gather(
            *(sender.send(s, push_payload) for s in subs),
            return_exceptions=True,
        )

        gone: list[PushSubscription] = []
        for sub, result in zip(subs, results, strict=True):
            if isinstance(result, BaseException):
                log.warning("push_send_raised", endpoint=sub.endpoint, error=str(result))
                continue
            if result is False:
                gone.append(sub)

        for sub in gone:
            await dao.delete_by_endpoint(sub.endpoint)
    except Exception as exc:
        log.warning("push_fanout_failed", user_id=str(user_id), error=str(exc))
