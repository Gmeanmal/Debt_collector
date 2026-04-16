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

from core.config import get_settings
from core.db import SessionMaker
from core.security import hash_password
from models.user import Goddess, User, UserRole, UserStatus

log = structlog.get_logger()


DEV_ADMIN_USERNAME = "admin"
DEV_ADMIN_EMAIL = "admin+dev@debt-collector.uk"
DEV_ADMIN_PASSWORD = "177@tTr$EbgA2CvMr@&4FM#DYaq6"  # noqa: S105 — dev-only seed constant

DEV_GODDESS_EMAIL = "meanmal@debt-collector.uk"
DEV_GODDESS_PASSWORD = "!Z#9by05NEnHsi*m%Q&8XKS$d2$%"  # noqa: S105 — dev-only seed constant
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


async def _seed_goddess_kek(session: AsyncSession) -> str:
    """Seed a KEK row for the dev goddess if ROOT_KEK_B64 is configured."""
    if not get_settings().root_kek_b64:
        return "skipped (ROOT_KEK_B64 not set)"

    from models.goddess_kek import GoddessKek  # local import — model may not be migrated yet
    from services.crypto.goddess_kek import ensure_goddess_kek

    result = await session.execute(select(User).where(col(User.email) == DEV_GODDESS_EMAIL))
    user = result.scalar_one_or_none()
    if user is None or user.goddess_id is None:
        return "skipped (goddess user not found)"

    from sqlmodel import col as _col

    kek_result = await session.execute(
        select(GoddessKek).where(_col(GoddessKek.goddess_id) == user.goddess_id)
    )
    if kek_result.scalar_one_or_none() is not None:
        log.info("goddess KEK already seeded", goddess_id=str(user.goddess_id))
        return "skipped"

    await ensure_goddess_kek(session, user.goddess_id)
    log.info("seeded goddess KEK", goddess_id=str(user.goddess_id))
    return "created"


async def seed_admin_and_goddess() -> None:
    from seeds.consents import seed_consent_text
    from seeds.kinks import seed_kinks

    async with SessionMaker() as session:
        admin_status = await _seed_admin(session)
        goddess_status = await _seed_goddess(session)
        kek_status = await _seed_goddess_kek(session)
        await seed_kinks(session)
        await seed_consent_text(session)
        await session.commit()

    print()
    print("  Bootstrap summary")
    print("  ─────────────────────────────────────────")
    print(f"  admin      ({DEV_ADMIN_EMAIL}): {admin_status}")
    print(f"  goddess    ({DEV_GODDESS_EMAIL}): {goddess_status}")
    print(f"  goddess KEK: {kek_status}")
    print()


if __name__ == "__main__":
    asyncio.run(seed_admin_and_goddess())
