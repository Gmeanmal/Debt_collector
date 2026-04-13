"""Bootstrap admin + goddess accounts. Idempotent — safe to run multiple times."""

from __future__ import annotations

import asyncio
from uuid import uuid4

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.db import SessionMaker
from core.security import hash_password
from models.user import Goddess, User, UserRole, UserStatus

log = structlog.get_logger()


async def _seed_admin(session: AsyncSession, s: object) -> str:
    result = await session.execute(select(User).where(User.email == s.admin_email))
    existing = result.scalar_one_or_none()
    if existing is not None:
        log.info("already seeded", email=s.admin_email)
        return "skipped"

    session.add(
        User(
            id=uuid4(),
            username=s.admin_username,
            email=s.admin_email,
            password_hash=hash_password(s.admin_password),
            role=UserRole.admin,
            status=UserStatus.active,
            theme_preference="dark",
        )
    )
    log.info("seeded admin", email=s.admin_email)
    return "created"


async def _seed_goddess(session: AsyncSession, s: object) -> str:
    result = await session.execute(select(User).where(User.email == s.goddess_email))
    existing = result.scalar_one_or_none()

    if existing is not None and existing.goddess_id is not None:
        log.info("already seeded", email=s.goddess_email)
        return "skipped"

    if existing is not None and existing.goddess_id is None:
        goddess_result = await session.execute(
            select(Goddess).where(Goddess.email == s.goddess_email)
        )
        goddess = goddess_result.scalar_one_or_none()
        if goddess is None:
            goddess = Goddess(
                id=uuid4(),
                display_name=s.goddess_display_name,
                email=s.goddess_email,
                password_hash=existing.password_hash,
            )
            session.add(goddess)
            await session.flush()
        existing.goddess_id = goddess.id
        session.add(existing)
        log.info("patched goddess link", email=s.goddess_email)
        return "patched"

    goddess_user = User(
        id=uuid4(),
        username="goddess",
        email=s.goddess_email,
        password_hash=hash_password(s.goddess_password),
        role=UserRole.goddess,
        status=UserStatus.active,
        theme_preference="dark",
    )
    session.add(goddess_user)
    await session.flush()

    goddess = Goddess(
        id=uuid4(),
        display_name=s.goddess_display_name,
        email=s.goddess_email,
        password_hash=goddess_user.password_hash,
    )
    session.add(goddess)
    await session.flush()

    goddess_user.goddess_id = goddess.id
    session.add(goddess_user)
    log.info("seeded goddess", email=s.goddess_email)
    return "created"


async def seed_admin_and_goddess() -> None:
    s = get_settings()
    async with SessionMaker() as session:
        admin_status = await _seed_admin(session, s)
        goddess_status = await _seed_goddess(session, s)
        await session.commit()

    print()
    print("  Bootstrap summary")
    print("  ─────────────────────────────────────────")
    print(f"  admin   ({s.admin_email}): {admin_status}")
    print(f"  goddess ({s.goddess_email}): {goddess_status}")
    print()


if __name__ == "__main__":
    asyncio.run(seed_admin_and_goddess())
