from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.consent_acceptance import ConsentAcceptance
from models.consent_text import ConsentText


class ConsentDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_current(self, slug: str) -> ConsentText | None:
        """Return the highest-version `consent_text` for the given slug, or None."""
        result = await self._session.execute(
            select(ConsentText)
            .where(col(ConsentText.slug) == slug)
            .order_by(col(ConsentText.version).desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, consent_text_id: UUID) -> ConsentText | None:
        """Return a `consent_text` row by id, or None when absent."""
        return await self._session.get(ConsentText, consent_text_id)

    async def has_accepted(self, user_id: UUID, slug: str) -> bool:
        """True if the user has accepted the latest version of the given slug."""
        current = await self.get_current(slug)
        if current is None:
            return False
        result = await self._session.execute(
            select(ConsentAcceptance.id)
            .where(
                col(ConsentAcceptance.user_id) == user_id,
                col(ConsentAcceptance.consent_text_id) == current.id,
            )
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def get_acceptance(
        self, user_id: UUID, consent_text_id: UUID
    ) -> ConsentAcceptance | None:
        """Return the acceptance row for a (user, consent_text), or None."""
        result = await self._session.execute(
            select(ConsentAcceptance).where(
                col(ConsentAcceptance.user_id) == user_id,
                col(ConsentAcceptance.consent_text_id) == consent_text_id,
            )
        )
        return result.scalar_one_or_none()

    async def record_acceptance(
        self,
        *,
        user_id: UUID,
        consent_text_id: UUID,
        ip_address: str | None,
    ) -> ConsentAcceptance:
        """Insert an acceptance row. The caller must have verified no duplicate exists."""
        row = ConsentAcceptance(
            user_id=user_id,
            consent_text_id=consent_text_id,
            ip_address=ip_address,
        )
        self._session.add(row)
        await self._session.flush()
        return row

    async def list_acceptances_for_user(
        self, user_id: UUID
    ) -> list[tuple[ConsentText, ConsentAcceptance]]:
        """Return every (consent_text, acceptance) pair for the given user.

        Joined so the router can surface slug + version without an extra lookup per row.
        """
        result = await self._session.execute(
            select(ConsentText, ConsentAcceptance)
            .join(
                ConsentAcceptance,
                col(ConsentAcceptance.consent_text_id) == col(ConsentText.id),
            )
            .where(col(ConsentAcceptance.user_id) == user_id)
            .order_by(col(ConsentAcceptance.accepted_at).desc())
        )
        rows: list[tuple[ConsentText, ConsentAcceptance]] = []
        for text, acceptance in result.all():
            rows.append((text, acceptance))
        return rows
