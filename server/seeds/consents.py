"""Idempotent seed for the initial consent texts (v1).

Inserts v1 placeholder markdown for the three consent families the app launches with:
`medical`, `blackmail_upload`, and `device_connect`. Re-running is safe — rows whose
`(slug, version)` pair already exists are skipped.
"""

from __future__ import annotations

from typing import TypedDict

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.consent_text import ConsentText

log = structlog.get_logger()


class _ConsentSpec(TypedDict):
    slug: str
    version: int
    body_md: str


_PLACEHOLDER_BODY = "Placeholder consent text — replace before production."


_CONSENTS: list[_ConsentSpec] = [
    {"slug": "medical", "version": 1, "body_md": _PLACEHOLDER_BODY},
    {"slug": "blackmail_upload", "version": 1, "body_md": _PLACEHOLDER_BODY},
    {"slug": "device_connect", "version": 1, "body_md": _PLACEHOLDER_BODY},
]


async def seed_consent_text(session: AsyncSession) -> None:
    """Seed the initial consent texts. Idempotent: skips existing (slug, version) pairs."""
    for spec in _CONSENTS:
        existing = await session.execute(
            select(ConsentText).where(
                col(ConsentText.slug) == spec["slug"],
                col(ConsentText.version) == spec["version"],
            )
        )
        if existing.scalar_one_or_none() is not None:
            log.debug("consent_text already seeded", slug=spec["slug"], version=spec["version"])
            continue
        session.add(
            ConsentText(
                slug=spec["slug"],
                version=spec["version"],
                body_md=spec["body_md"],
            )
        )
        log.info("seeded consent_text", slug=spec["slug"], version=spec["version"])

    await session.flush()
