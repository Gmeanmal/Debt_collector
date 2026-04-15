from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.exceptions import NotFound
from models.profile_change_request import ProfileChangeRequest, ProfileChangeRequestStatus


class ProfileChangeRequestDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, request: ProfileChangeRequest) -> ProfileChangeRequest:
        """Persist a new ProfileChangeRequest and return it after flush."""
        self._session.add(request)
        await self._session.flush()
        return request

    async def get_by_id(self, request_id: UUID) -> ProfileChangeRequest:
        """Return the request or raise NotFound."""
        row = await self._session.get(ProfileChangeRequest, request_id)
        if row is None:
            raise NotFound("profile change request not found")
        return row

    async def list_by_sub(self, sub_id: UUID) -> list[ProfileChangeRequest]:
        """Return all requests for the given sub, newest first."""
        result = await self._session.execute(
            select(ProfileChangeRequest)
            .where(col(ProfileChangeRequest.sub_id) == sub_id)
            .order_by(col(ProfileChangeRequest.requested_at).desc())
        )
        return list(result.scalars().all())

    async def list_pending_by_goddess(
        self, goddess_sub_ids: list[UUID]
    ) -> list[ProfileChangeRequest]:
        """Return pending requests for subs belonging to a given goddess."""
        if not goddess_sub_ids:
            return []
        result = await self._session.execute(
            select(ProfileChangeRequest)
            .where(
                col(ProfileChangeRequest.sub_id).in_(goddess_sub_ids),
                col(ProfileChangeRequest.status) == ProfileChangeRequestStatus.pending,
            )
            .order_by(col(ProfileChangeRequest.requested_at).asc())
        )
        return list(result.scalars().all())

    async def set_status(
        self,
        request: ProfileChangeRequest,
        status: ProfileChangeRequestStatus,
        note: str | None = None,
        resolved_at: datetime | None = None,
        fee_payment_id: UUID | None = None,
    ) -> ProfileChangeRequest:
        """Update status and optional metadata fields."""
        request.status = status
        if note is not None:
            request.resolution_note = note
        if resolved_at is not None:
            request.resolved_at = resolved_at
        if fee_payment_id is not None:
            request.fee_payment_id = fee_payment_id
        self._session.add(request)
        await self._session.flush()
        return request

    async def set_fee(
        self, request: ProfileChangeRequest, fee_amount: object
    ) -> ProfileChangeRequest:
        """Record the goddess-imposed fee and move to awaiting_fee_payment."""
        from decimal import Decimal

        request.fee_amount = Decimal(str(fee_amount))
        request.status = ProfileChangeRequestStatus.awaiting_fee_payment
        self._session.add(request)
        await self._session.flush()
        return request

    async def link_fee_payment(
        self, request: ProfileChangeRequest, payment_id: UUID
    ) -> ProfileChangeRequest:
        """Record the payment declaration id linked to the fee."""
        request.fee_payment_id = payment_id
        self._session.add(request)
        await self._session.flush()
        return request
