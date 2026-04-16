from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import Conflict, NotFound, Validation
from daos.consent_dao import ConsentDao
from models.consent_text import ConsentText
from schemas.consent import (
    ConsentAcceptanceOut,
    ConsentTextOut,
    MyConsentOut,
    MyConsentsOut,
)


class ConsentController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = ConsentDao(session)

    async def get_current(self, slug: str) -> ConsentTextOut:
        """Return the current consent text for a slug, or raise NotFound."""
        text = await self._dao.get_current(slug)
        if text is None:
            raise NotFound(f"consent slug '{slug}' not found")
        return ConsentTextOut.model_validate(text)

    async def accept(
        self,
        *,
        user_id: UUID,
        slug: str,
        consent_text_id: UUID,
        ip_address: str | None,
    ) -> ConsentAcceptanceOut:
        """Record the user's acceptance of a consent text version.

        - 404 if the slug has no current version
        - 422 if `consent_text_id` does not match the current version for the slug
        - 409 if the user has already accepted this exact version
        """
        current = await self._dao.get_current(slug)
        if current is None:
            raise NotFound(f"consent slug '{slug}' not found")
        if current.id != consent_text_id:
            raise Validation(
                "consent_text_id does not match the current version for this slug",
                slug=slug,
                current_version=current.version,
                current_consent_text_id=str(current.id),
            )

        existing = await self._dao.get_acceptance(user_id, current.id)
        if existing is not None:
            raise Conflict(
                "consent already accepted",
                slug=slug,
                version=current.version,
            )

        row = await self._dao.record_acceptance(
            user_id=user_id,
            consent_text_id=current.id,
            ip_address=ip_address,
        )
        return ConsentAcceptanceOut(
            id=row.id,
            slug=current.slug,
            version=current.version,
            accepted_at=row.accepted_at,
        )

    async def list_for_user(self, user_id: UUID) -> MyConsentsOut:
        """List every consent the user has accepted, joined with the text metadata."""
        rows = await self._dao.list_acceptances_for_user(user_id)
        consents: list[MyConsentOut] = []
        for text, acceptance in rows:
            consents.append(
                MyConsentOut(
                    slug=text.slug,
                    version=text.version,
                    accepted_at=acceptance.accepted_at,
                )
            )
        return MyConsentsOut(consents=consents)

    async def get_current_raw(self, slug: str) -> ConsentText | None:
        """Return the current `ConsentText` row (for the gate dependency)."""
        return await self._dao.get_current(slug)

    async def has_accepted(self, user_id: UUID, slug: str) -> bool:
        """True if the user has accepted the latest version of the slug.

        Used by the `require_consent` gate dependency.
        """
        return await self._dao.has_accepted(user_id, slug)
