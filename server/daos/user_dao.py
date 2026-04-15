from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.user import AvatarKey, User


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
