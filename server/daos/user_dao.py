from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.user import User


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
        avatar_url: str | None,
    ) -> User:
        user.first_name = first_name
        user.last_name = last_name
        user.bio = bio
        user.avatar_url = avatar_url
        self._session.add(user)
        return user
