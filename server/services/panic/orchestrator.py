"""Low-level panic helpers — pure DB mutations, no business-rule branches."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.ritual import Ritual
from models.status_event import StatusEvent
from models.sub_profile import OwnershipStatus, SubProfile
from models.task import Task, TaskStatus
from models.user import User, UserRole


async def pause_all_rituals_for_sub(session: AsyncSession, sub_id: UUID) -> int:
    """Set paused=True on every non-paused ritual belonging to sub_id.

    Returns the number of rows updated.
    """
    now = datetime.now(UTC).replace(tzinfo=None)
    result = await session.execute(
        update(Ritual)
        .where(
            col(Ritual.sub_id) == sub_id,
            col(Ritual.paused).is_(False),
        )
        .values(paused=True, updated_at=now)
        .returning(col(Ritual.id))
    )
    rows = result.fetchall()
    return len(rows)


async def cancel_pending_tasks_for_sub(session: AsyncSession, sub_id: UUID) -> int:
    """Cancel open + submitted tasks for sub_id. Returns rows updated."""
    now = datetime.now(UTC).replace(tzinfo=None)
    result = await session.execute(
        update(Task)
        .where(
            col(Task.sub_id) == sub_id,
            col(Task.status).in_([TaskStatus.open, TaskStatus.submitted]),
        )
        .values(status=TaskStatus.cancelled, updated_at=now)
        .returning(col(Task.id))
    )
    return len(result.fetchall())


async def soft_release(
    session: AsyncSession,
    sub_id: UUID,
    goddess_id: UUID,
) -> bool:
    """Transition ownership_status to `released` if the current state allows it.

    Writes a status_event row with reason='sub_panic' when the transition occurs.
    Returns True when the transition was performed, False when it was skipped
    because the status was already `released`.
    """
    profile = await session.get(SubProfile, sub_id)
    if profile is None:
        return False

    if profile.ownership_status == OwnershipStatus.released:
        return False

    from_status = profile.ownership_status
    profile.ownership_status = OwnershipStatus.released
    profile.updated_at = datetime.now(UTC).replace(tzinfo=None)
    session.add(profile)

    event = StatusEvent(
        sub_id=sub_id,
        goddess_id=goddess_id,
        from_status=from_status,
        to_status=OwnershipStatus.released,
        reason="sub_panic",
        created_by=sub_id,
    )
    session.add(event)
    await session.flush()
    return True


async def get_goddess_user_id_for_sub(session: AsyncSession, sub_id: UUID) -> UUID | None:
    """Return the User.id of the goddess-role user linked to the sub's goddess, if any."""
    sub = await session.get(User, sub_id)
    if sub is None or sub.goddess_id is None:
        return None

    result = await session.execute(
        select(User.id).where(
            col(User.goddess_id) == sub.goddess_id,
            col(User.role) == UserRole.goddess,
        )
    )
    return result.scalar_one_or_none()
