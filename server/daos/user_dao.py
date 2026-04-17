from datetime import datetime
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.user import AvatarKey, User, UserRole, UserStatus


class UserDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(User).where(col(User.email) == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self._session.get(User, user_id)

    async def update_last_login(self, user: User, now: datetime) -> None:
        user.last_login_at = now
        self._session.add(user)

    async def get_by_username(self, username: str) -> User | None:
        result = await self._session.execute(select(User).where(col(User.username) == username))
        return result.scalar_one_or_none()

    async def save(self, user: User) -> None:
        self._session.add(user)

    async def update_theme_preference(self, user: User, theme_preference: str) -> User:
        user.theme_preference = theme_preference
        self._session.add(user)
        return user

    async def update_profile(
        self,
        user: User,
        first_name: str | None,
        last_name: str | None,
        bio: str | None,
        avatar_key: AvatarKey,
    ) -> User:
        """Update basic profile fields for the given user."""
        user.first_name = first_name
        user.last_name = last_name
        user.bio = bio
        user.avatar_key = avatar_key
        self._session.add(user)
        return user

    async def update_profile_fields(self, user: User, **fields: object) -> User:
        """Apply an arbitrary set of profile field patches to the user row."""
        for key, value in fields.items():
            setattr(user, key, value)
        self._session.add(user)
        return user

    async def update_payment_handle(self, user: User, handle: str | None) -> User:
        """Set or clear the sub's payment handle."""
        user.payment_handle = handle
        self._session.add(user)
        return user

    async def count_subs_by_status(self, goddess_id: UUID, status: UserStatus) -> int:
        """Return the number of sub-role users linked to this goddess with the given status."""
        result = await self._session.execute(
            select(func.count())
            .select_from(User)
            .where(
                col(User.goddess_id) == goddess_id,
                col(User.role) == UserRole.sub,
                col(User.status) == status,
            )
        )
        return int(result.scalar_one() or 0)

    async def get_many_by_ids(self, user_ids: list[UUID]) -> dict[UUID, User]:
        """Return a mapping of user_id → User for the given IDs (single query)."""
        if not user_ids:
            return {}
        result = await self._session.execute(select(User).where(col(User.id).in_(user_ids)))
        return {u.id: u for u in result.scalars().all()}

    async def list_active_subs(self, goddess_id: UUID) -> list[User]:
        """Return all active sub-role users linked to this goddess."""
        result = await self._session.execute(
            select(User).where(
                col(User.goddess_id) == goddess_id,
                col(User.role) == UserRole.sub,
                col(User.status) == UserStatus.active,
            )
        )
        return list(result.scalars().all())
