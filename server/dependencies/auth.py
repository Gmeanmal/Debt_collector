# TODO(scope-C): mutations performed during an impersonation session are not yet attributed
# to the original admin. To close this gap, propagate AuthContext.impersonator through every
# controller call and record the admin's id alongside the mutated entity in the audit log.
from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_session
from core.exceptions import Forbidden, Unauthorized
from core.security import decode_access_token
from daos.user_dao import UserDao
from models.user import User, UserRole


@dataclass
class AuthContext:
    user: User
    impersonator: User | None


async def get_auth_context(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
) -> AuthContext:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise Unauthorized("missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        data = decode_access_token(token)
    except Exception as exc:
        raise Unauthorized("invalid access token") from exc
    dao = UserDao(session)
    user = await dao.get_by_id(UUID(data["sub"]))
    if user is None:
        raise Unauthorized("user not found")
    impersonator: User | None = None
    imp = data.get("imp")
    if imp:
        impersonator = await dao.get_by_id(UUID(imp))
    return AuthContext(user=user, impersonator=impersonator)


async def get_current_user(ctx: AuthContext = Depends(get_auth_context)) -> User:
    return ctx.user


def require_role(*roles: UserRole):
    async def guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise Forbidden("role not permitted")
        return user

    return guard
