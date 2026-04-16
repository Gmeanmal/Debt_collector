from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.user import User, UserRole, UserStatus


async def resolve_sub(
    session: AsyncSession,
    goddess_id: UUID,
    payment_handle: str | None,
    reference_text: str | None,
) -> User | None:
    """Resolve a sub from a webhook payment handle or free-text reference.

    Matching priority:
    1. Exact match on user.payment_handle (case-sensitive).
    2. Case-insensitive match on user.payment_handle.
    3. reference_text contains user.display_name or user.username (case-insensitive).

    Only returns a user whose goddess_id matches, role is sub, and status is active.
    """
    candidates = await _active_subs_for_goddess(session, goddess_id)
    if not candidates:
        return None

    if payment_handle is not None:
        # Priority 1: exact handle match
        for user in candidates:
            if user.payment_handle == payment_handle:
                return user
        # Priority 2: case-insensitive handle match
        handle_lower = payment_handle.lower()
        for user in candidates:
            if user.payment_handle is not None and user.payment_handle.lower() == handle_lower:
                return user

    if reference_text is not None:
        ref_lower = reference_text.lower()
        for user in candidates:
            display_name = _build_display_name(user)
            if display_name and display_name.lower() in ref_lower:
                return user
            if user.username.lower() in ref_lower:
                return user

    return None


async def _active_subs_for_goddess(session: AsyncSession, goddess_id: UUID) -> list[User]:
    result = await session.execute(
        select(User).where(
            col(User.goddess_id) == goddess_id,
            col(User.role) == UserRole.sub,
            col(User.status) == UserStatus.active,
        )
    )
    return list(result.scalars().all())


def _build_display_name(user: User) -> str | None:
    parts = [p for p in (user.first_name, user.last_name) if p]
    return " ".join(parts) if parts else None
