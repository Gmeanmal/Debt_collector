from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequest
from daos.allocation_dao import PaymentAllocationDao
from daos.payment_dao import PaymentDeclarationDao
from daos.payment_webhook_dao import PaymentWebhookDao
from models.payment import (
    AllocationTargetType,
    DeclarationSource,
    PaymentCategory,
    PaymentStatus,
)
from models.payment_webhook_event import (
    PaymentWebhookEvent,
    PaymentWebhookProvider,
    PaymentWebhookResult,
)
from models.user import User
from services.ingest.matcher import resolve_sub


@dataclass(frozen=True)
class IngestResult:
    """Outcome of a single webhook event ingestion attempt."""

    event: PaymentWebhookEvent
    result: PaymentWebhookResult
    declaration_id: UUID | None


class IngestController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._webhook_dao = PaymentWebhookDao(session)
        self._decl_dao = PaymentDeclarationDao(session)
        self._alloc_dao = PaymentAllocationDao(session)

    async def ingest_event(
        self,
        provider: PaymentWebhookProvider,
        provider_event_id: str,
        amount: Decimal,
        currency: str,
        external_timestamp: datetime | None,
        sub_identifier: str | None,
        reference_text: str | None,
        raw_payload: dict,  # type: ignore[type-arg]
        signature_verified: bool,
        goddess_id: UUID,
        method_id: UUID,
        category: PaymentCategory = PaymentCategory.tribute,
    ) -> IngestResult:
        """Ingest a provider webhook event and create a declaration if the sub can be resolved.

        Idempotent on (provider, provider_event_id): a duplicate call returns the existing
        event with result=duplicate and no new declaration.

        Rejects non-GBP payloads with a BadRequest before touching the database.
        """
        if currency.upper() != "GBP":
            raise BadRequest(f"non-GBP currency rejected: {currency!r}")

        event, created = await self._webhook_dao.insert_or_get(
            provider=provider,
            provider_event_id=provider_event_id,
            payload_json=raw_payload,
            signature_verified=signature_verified,
            goddess_id=goddess_id,
        )

        if not created:
            return IngestResult(
                event=event,
                result=PaymentWebhookResult.duplicate,
                declaration_id=event.matched_declaration_id,
            )

        sub = await resolve_sub(
            session=self._session,
            goddess_id=goddess_id,
            payment_handle=sub_identifier,
            reference_text=reference_text,
        )

        if sub is None:
            await self._webhook_dao.mark_unmatched(event)
            return IngestResult(
                event=event,
                result=PaymentWebhookResult.unmatched,
                declaration_id=None,
            )

        try:
            declaration_id = await self._create_declaration_and_allocation(
                sub=sub,
                goddess_id=goddess_id,
                method_id=method_id,
                amount=amount,
                external_timestamp=external_timestamp,
                category=category,
            )
        except Exception as exc:
            await self._webhook_dao.mark_error(event, str(exc))
            raise

        await self._webhook_dao.mark_matched(event, declaration_id)
        return IngestResult(
            event=event,
            result=PaymentWebhookResult.matched,
            declaration_id=declaration_id,
        )

    async def _create_declaration_and_allocation(
        self,
        sub: User,
        goddess_id: UUID,
        method_id: UUID,
        amount: Decimal,
        external_timestamp: datetime | None,
        category: PaymentCategory,
    ) -> UUID:
        now = datetime.now(UTC).replace(tzinfo=None)
        decl = await self._decl_dao.create(
            {
                "sub_id": sub.id,
                "goddess_id": goddess_id,
                "method_id": method_id,
                "amount": amount,
                "external_timestamp": external_timestamp,
                "category": category,
                "status": PaymentStatus.validated,
                "created_by": sub.id,
                "validated_at": now,
                "source": DeclarationSource.ingested,
            }
        )

        target_type = _category_to_allocation_target(category)
        if target_type is not None:
            await self._alloc_dao.create(decl, target_type, decl.target_id)

        return decl.id


def _category_to_allocation_target(category: PaymentCategory) -> AllocationTargetType | None:
    mapping: dict[PaymentCategory, AllocationTargetType] = {
        PaymentCategory.entry: AllocationTargetType.entry,
        PaymentCategory.tribute: AllocationTargetType.tribute,
        PaymentCategory.rolling: AllocationTargetType.rolling_cycle,
        PaymentCategory.weekly_debt: AllocationTargetType.contract_debt,
        PaymentCategory.debt_payment: AllocationTargetType.contract_debt,
        PaymentCategory.buyout: AllocationTargetType.contract_buyout,
    }
    return mapping.get(category)
