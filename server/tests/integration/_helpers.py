"""Shared helpers for integration tests — DB seeding utilities."""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from core.security import hash_password
from models.sub_profile import OwnershipStatus, SubProfile
from models.user import Goddess, User, UserRole, UserStatus


async def seed_goddess(session: AsyncSession, suffix: str = "") -> tuple[Goddess, User]:
    """Create a Goddess profile + linked User row; commits so the app can see it."""
    goddess = Goddess(
        id=uuid4(),
        display_name=f"Test Goddess{suffix}",
        email=f"goddess{suffix}@int.test",
        password_hash=hash_password("goddesspass123"),
    )
    session.add(goddess)
    await session.flush()

    user = User(
        id=uuid4(),
        goddess_id=goddess.id,
        username=f"goddess_user{suffix}",
        email=f"goddess{suffix}@int.test",
        password_hash=hash_password("goddesspass123"),
        role=UserRole.goddess,
        status=UserStatus.active,
    )
    session.add(user)
    await session.flush()
    await session.commit()
    return goddess, user


async def seed_admin(session: AsyncSession, suffix: str = "") -> User:
    """Create an admin User row; commits immediately."""
    user = User(
        id=uuid4(),
        username=f"admin_user{suffix}",
        email=f"admin{suffix}@int.test",
        password_hash=hash_password("adminpass123"),
        role=UserRole.admin,
        status=UserStatus.active,
    )
    session.add(user)
    await session.commit()
    return user


async def seed_sub(
    session: AsyncSession,
    goddess_id: UUID,
    suffix: str = "",
    status: UserStatus = UserStatus.active,
) -> User:
    """Create a sub User row linked to a goddess; commits immediately."""
    user = User(
        id=uuid4(),
        goddess_id=goddess_id,
        username=f"sub_user{suffix}",
        email=f"sub{suffix}@int.test",
        password_hash=hash_password("subpass123"),
        role=UserRole.sub,
        status=status,
    )
    session.add(user)
    await session.flush()
    session.add(
        SubProfile(
            user_id=user.id,
            ownership_status=OwnershipStatus.free,
            joined_empire_at=datetime.now(UTC).replace(tzinfo=None),
        )
    )
    await session.commit()
    return user


def contract_payload() -> dict[str, object]:
    return {
        "principal": "500.00",
        "interest_rate": "0.200000",
        "interest_period": "monthly",
        "duration_periods": 6,
        "payment_frequency": "monthly",
        "minimum_payment": "50.00",
        "late_penalty_severity": "light",
        "late_penalty_percent": "0.0500",
        "dom_can_add_surprise_penalty": False,
        "mid_contract_addition_mode": "disabled",
        "exit_amount": "600.00",
    }
