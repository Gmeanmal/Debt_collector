"""Bootstrap admin + goddess accounts for local dev. Idempotent.

These are dev fake data, not secrets: the seed script is for `make init-dbs` only
and never runs in prod. For prod, onboard the real admin/goddess via a one-off
script or an admin UI flow (TODO).
"""

from __future__ import annotations

import asyncio
from uuid import uuid4

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.db import SessionMaker
from core.security import hash_password
from models.user import Goddess, User, UserRole, UserStatus

log = structlog.get_logger()


DEV_ADMIN_USERNAME = "admin"
DEV_ADMIN_EMAIL = "admin@example.test"
DEV_ADMIN_PASSWORD = "ChangeMe!Dev123"  # noqa: S105 — dev-only seed constant

DEV_GODDESS_EMAIL = "meanmal@example.test"
DEV_GODDESS_PASSWORD = "ChangeMe!Dev123"  # noqa: S105 — dev-only seed constant
DEV_GODDESS_DISPLAY_NAME = "Mean Mal"


async def _seed_admin(session: AsyncSession) -> str:
    result = await session.execute(select(User).where(col(User.email) == DEV_ADMIN_EMAIL))
    existing = result.scalar_one_or_none()
    if existing is not None:
        log.info("already seeded", email=DEV_ADMIN_EMAIL)
        return "skipped"

    session.add(
        User(
            id=uuid4(),
            username=DEV_ADMIN_USERNAME,
            email=DEV_ADMIN_EMAIL,
            password_hash=hash_password(DEV_ADMIN_PASSWORD),
            role=UserRole.admin,
            status=UserStatus.active,
            theme_preference="dark",
        )
    )
    log.info("seeded admin", email=DEV_ADMIN_EMAIL)
    return "created"


async def _seed_goddess(session: AsyncSession) -> str:
    result = await session.execute(select(User).where(col(User.email) == DEV_GODDESS_EMAIL))
    existing = result.scalar_one_or_none()

    if existing is not None and existing.goddess_id is not None:
        log.info("already seeded", email=DEV_GODDESS_EMAIL)
        return "skipped"

    if existing is not None and existing.goddess_id is None:
        goddess_result = await session.execute(
            select(Goddess).where(col(Goddess.email) == DEV_GODDESS_EMAIL)
        )
        goddess = goddess_result.scalar_one_or_none()
        if goddess is None:
            goddess = Goddess(
                id=uuid4(),
                display_name=DEV_GODDESS_DISPLAY_NAME,
                email=DEV_GODDESS_EMAIL,
                password_hash=existing.password_hash,
            )
            session.add(goddess)
            await session.flush()
        existing.goddess_id = goddess.id
        session.add(existing)
        log.info("patched goddess link", email=DEV_GODDESS_EMAIL)
        return "patched"

    goddess_user = User(
        id=uuid4(),
        username="goddess",
        email=DEV_GODDESS_EMAIL,
        password_hash=hash_password(DEV_GODDESS_PASSWORD),
        role=UserRole.goddess,
        status=UserStatus.active,
        theme_preference="dark",
    )
    session.add(goddess_user)
    await session.flush()

    goddess = Goddess(
        id=uuid4(),
        display_name=DEV_GODDESS_DISPLAY_NAME,
        email=DEV_GODDESS_EMAIL,
        password_hash=goddess_user.password_hash,
    )
    session.add(goddess)
    await session.flush()

    goddess_user.goddess_id = goddess.id
    session.add(goddess_user)
    log.info("seeded goddess", email=DEV_GODDESS_EMAIL)
    return "created"


async def seed_admin_and_goddess() -> None:
    async with SessionMaker() as session:
        admin_status = await _seed_admin(session)
        goddess_status = await _seed_goddess(session)
        await session.commit()

    print()
    print("  Bootstrap summary")
    print("  ─────────────────────────────────────────")
    print(f"  admin   ({DEV_ADMIN_EMAIL}): {admin_status}")
    print(f"  goddess ({DEV_GODDESS_EMAIL}): {goddess_status}")
    print()


if __name__ == "__main__":
    asyncio.run(seed_admin_and_goddess())
