from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_session
from core.exceptions import Forbidden, Unauthorized
from core.security import decode_access_token
from daos.user_dao import UserDao
from models.user import User, UserRole


async def get_current_user(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise Unauthorized("missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        data = decode_access_token(token)
    except Exception as exc:
        raise Unauthorized("invalid access token") from exc
    user = await UserDao(session).get_by_id(UUID(data["sub"]))
    if user is None:
        raise Unauthorized("user not found")
    return user


def require_role(*roles: UserRole):
    async def guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise Forbidden("role not permitted")
        return user

    return guard
