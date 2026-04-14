from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, func, select

from models.notification import Notification


class NotificationDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, notification: Notification) -> Notification:
        self._session.add(notification)
        await self._session.flush()
        return notification

    async def list_for_user(self, user_id: UUID, limit: int = 50) -> list[Notification]:
        result = await self._session.execute(
            select(Notification)
            .where(col(Notification.user_id) == user_id)
            .order_by(col(Notification.created_at).desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def mark_read(self, notification_id: UUID, user_id: UUID) -> None:
        result = await self._session.execute(
            select(Notification).where(
                col(Notification.id) == notification_id,
                col(Notification.user_id) == user_id,
            )
        )
        notification = result.scalar_one_or_none()
        if notification is None or notification.read_at is not None:
            return
        notification.read_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(notification)
        await self._session.flush()

    async def unread_count(self, user_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(Notification)
            .where(
                col(Notification.user_id) == user_id,
                col(Notification.read_at).is_(None),
            )
        )
        return int(result.scalar_one())
