from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.payment_webhook_event import (
    PaymentWebhookEvent,
    PaymentWebhookProvider,
    PaymentWebhookResult,
)


class PaymentWebhookDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def insert_or_get(
        self,
        provider: PaymentWebhookProvider,
        provider_event_id: str,
        payload_json: dict,  # type: ignore[type-arg]
        signature_verified: bool,
        goddess_id: UUID | None,
    ) -> tuple[PaymentWebhookEvent, bool]:
        """Insert a new webhook event or return the existing row if already seen.

        Returns (event, created) where created is False when the row was a duplicate.
        Uses SELECT-then-INSERT rather than ON CONFLICT RETURNING to stay within SQLModel
        type constraints; the unique index on (provider, provider_event_id) guarantees
        atomicity under concurrent inserts via Postgres serialisation.
        """
        existing = await self._try_fetch_by_provider_event(provider, provider_event_id)
        if existing is not None:
            return existing, False

        event = PaymentWebhookEvent(
            provider=provider,
            provider_event_id=provider_event_id,
            payload_json=payload_json,
            signature_verified=signature_verified,
            goddess_id=goddess_id,
            result=PaymentWebhookResult.pending,
        )
        self._session.add(event)
        await self._session.flush()
        return event, True

    async def list_by_goddess(
        self,
        goddess_id: UUID,
        result_filter: PaymentWebhookResult | None = None,
        limit: int = 100,
    ) -> list[PaymentWebhookEvent]:
        """Return webhook events for a goddess, optionally filtered by result."""
        stmt = (
            select(PaymentWebhookEvent)
            .where(col(PaymentWebhookEvent.goddess_id) == goddess_id)
            .order_by(col(PaymentWebhookEvent.received_at).desc())
            .limit(limit)
        )
        if result_filter is not None:
            stmt = stmt.where(col(PaymentWebhookEvent.result) == result_filter)
        rows = await self._session.execute(stmt)
        return list(rows.scalars().all())

    async def mark_matched(self, event: PaymentWebhookEvent, declaration_id: UUID) -> None:
        """Mark an event as matched and set the linked declaration id."""
        event.result = PaymentWebhookResult.matched
        event.matched_declaration_id = declaration_id
        self._session.add(event)
        await self._session.flush()

    async def mark_unmatched(self, event: PaymentWebhookEvent) -> None:
        """Mark an event as unmatched (no sub resolved)."""
        event.result = PaymentWebhookResult.unmatched
        self._session.add(event)
        await self._session.flush()

    async def mark_error(self, event: PaymentWebhookEvent, message: str) -> None:
        """Mark an event as failed with an error message."""
        event.result = PaymentWebhookResult.error
        event.error_message = message
        self._session.add(event)
        await self._session.flush()

    async def _try_fetch_by_provider_event(
        self,
        provider: PaymentWebhookProvider,
        provider_event_id: str,
    ) -> PaymentWebhookEvent | None:
        result = await self._session.execute(
            select(PaymentWebhookEvent).where(
                col(PaymentWebhookEvent.provider) == provider,
                col(PaymentWebhookEvent.provider_event_id) == provider_event_id,
            )
        )
        return result.scalar_one_or_none()
