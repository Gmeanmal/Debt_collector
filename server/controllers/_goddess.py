from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import Forbidden
from models.user import Goddess, User, UserRole


async def resolve_goddess_id(session: AsyncSession, user_id: UUID) -> UUID:
    """Return the Goddess.id for the given user, or raise Forbidden."""
    result = await session.execute(
        select(Goddess)
        .join(User, col(User.goddess_id) == col(Goddess.id))
        .where(col(User.id) == user_id)
    )
    goddess = result.scalar_one_or_none()
    if goddess is None:
        raise Forbidden("goddess profile not found for this user")
    return goddess.id


async def resolve_goddess_user_id(session: AsyncSession, goddess_id: UUID) -> UUID | None:
    """Return the User.id for the goddess-role user linked to the given Goddess profile."""
    result = await session.execute(
        select(User.id).where(
            col(User.goddess_id) == goddess_id,
            col(User.role) == UserRole.goddess,
        )
    )
    return result.scalar_one_or_none()
