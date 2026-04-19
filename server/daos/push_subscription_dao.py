from uuid import UUID

from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.push_subscription import PushSubscription


class PushSubscriptionDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, sub: PushSubscription) -> PushSubscription:
        """Insert a new subscription. On endpoint conflict, rebind ownership to the new user
        and refresh keys + user_agent. Endpoints are globally unique per browser — a
        re-subscription from a different account must not collide."""
        self._session.add(sub)
        try:
            await self._session.flush()
            await self._session.refresh(sub)
            return sub
        except IntegrityError:
            await self._session.rollback()
            existing = await self._get_by_endpoint(sub.endpoint)
            if existing is None:
                raise
            existing.user_id = sub.user_id
            existing.p256dh = sub.p256dh
            existing.auth = sub.auth
            existing.user_agent = sub.user_agent
            self._session.add(existing)
            await self._session.flush()
            await self._session.refresh(existing)
            return existing

    async def list_for_user(self, user_id: UUID) -> list[PushSubscription]:
        result = await self._session.execute(
            select(PushSubscription)
            .where(col(PushSubscription.user_id) == user_id)
            .order_by(col(PushSubscription.created_at).desc())
        )
        return list(result.scalars().all())

    async def get_by_id_for_user(
        self, sub_id: UUID, user_id: UUID
    ) -> PushSubscription | None:
        result = await self._session.execute(
            select(PushSubscription).where(
                col(PushSubscription.id) == sub_id,
                col(PushSubscription.user_id) == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def delete_by_endpoint(self, endpoint: str) -> int:
        """Prune a subscription by endpoint after receiving HTTP 404/410 from the push server.
        Returns the number of rows deleted."""
        result = await self._session.execute(
            delete(PushSubscription).where(col(PushSubscription.endpoint) == endpoint)
        )
        await self._session.flush()
        return result.rowcount  # type: ignore[return-value]

    async def delete_for_user(self, sub_id: UUID, user_id: UUID) -> bool:
        result = await self._session.execute(
            delete(PushSubscription).where(
                col(PushSubscription.id) == sub_id,
                col(PushSubscription.user_id) == user_id,
            )
        )
        await self._session.flush()
        return bool(result.rowcount)  # type: ignore[attr-defined]

    async def _get_by_endpoint(self, endpoint: str) -> PushSubscription | None:
        result = await self._session.execute(
            select(PushSubscription).where(col(PushSubscription.endpoint) == endpoint)
        )
        return result.scalar_one_or_none()
