from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from controllers._goddess import resolve_goddess_id
from core.exceptions import BadRequest, Conflict, Forbidden, NotFound
from daos.payment_dao import PaymentDeclarationDao
from daos.payment_method_dao import PaymentMethodDao
from daos.profile_change_request_dao import ProfileChangeRequestDao
from daos.user_dao import UserDao
from models.payment import DeclarationSource, PaymentCategory, PaymentStatus
from models.profile_change_request import ProfileChangeRequest, ProfileChangeRequestStatus
from models.user import User
from schemas.profile import (
    GoddessEditSubProfileIn,
    GoddessRejectIn,
    GoddessSetFeeIn,
    PaymentHandleIn,
    ProfileChangeRequestIn,
    ProfileChangeRequestOut,
)


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _to_out(req: ProfileChangeRequest) -> ProfileChangeRequestOut:
    return ProfileChangeRequestOut.model_validate(req)


class ProfileController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._user_dao = UserDao(session)
        self._req_dao = ProfileChangeRequestDao(session)
        self._decl_dao = PaymentDeclarationDao(session)
        self._method_dao = PaymentMethodDao(session)

    async def request_change(
        self, sub_user: User, payload: ProfileChangeRequestIn
    ) -> ProfileChangeRequestOut:
        """Sub submits a profile change request. Creates a pending request."""
        if not payload.proposed_first_name and not payload.proposed_last_name \
                and not payload.proposed_display_name and not payload.proposed_notes \
                and not payload.proposed_avatar_key:
            raise BadRequest("at least one proposed field must be set")

        req = ProfileChangeRequest(
            sub_id=sub_user.id,
            requested_at=_now(),
            status=ProfileChangeRequestStatus.pending,
            proposed_first_name=payload.proposed_first_name,
            proposed_last_name=payload.proposed_last_name,
            proposed_display_name=payload.proposed_display_name,
            proposed_notes=payload.proposed_notes,
            proposed_avatar_key=payload.proposed_avatar_key,
        )
        await self._req_dao.create(req)
        return _to_out(req)

    async def list_my_requests(self, sub_user: User) -> list[ProfileChangeRequestOut]:
        """Return all change requests for the calling sub."""
        rows = await self._req_dao.list_by_sub(sub_user.id)
        return [_to_out(r) for r in rows]

    async def list_pending_for_goddess(self, goddess_user: User) -> list[ProfileChangeRequestOut]:
        """Return pending change requests from all subs belonging to this goddess."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        result = await self._session.execute(
            select(col(User.id)).where(col(User.goddess_id) == goddess_id)
        )
        sub_ids: list[UUID] = list(result.scalars().all())
        rows = await self._req_dao.list_pending_by_goddess(sub_ids)
        return [_to_out(r) for r in rows]

    async def approve_free(
        self, request_id: UUID, goddess_user: User
    ) -> ProfileChangeRequestOut:
        """Goddess approves a request without a fee — applies diff immediately."""
        req = await self._req_dao.get_by_id(request_id)
        await self._assert_goddess_owns_request(goddess_user, req)
        if req.status != ProfileChangeRequestStatus.pending:
            raise Conflict("only pending requests can be approved")

        await self._apply_diff(req)
        now = _now()
        await self._req_dao.set_status(
            req,
            ProfileChangeRequestStatus.approved,
            resolved_at=now,
        )
        return _to_out(req)

    async def set_fee(
        self, request_id: UUID, goddess_user: User, payload: GoddessSetFeeIn
    ) -> ProfileChangeRequestOut:
        """Goddess imposes a fee on a request — moves to awaiting_fee_payment."""
        req = await self._req_dao.get_by_id(request_id)
        await self._assert_goddess_owns_request(goddess_user, req)
        if req.status != ProfileChangeRequestStatus.pending:
            raise Conflict("only pending requests can have a fee imposed")

        await self._req_dao.set_fee(req, payload.fee_amount)
        return _to_out(req)

    async def accept_fee(
        self,
        request_id: UUID,
        sub_user: User,
        method_id: UUID,
    ) -> ProfileChangeRequestOut:
        """Sub accepts a fee — creates a profile_change_fee payment declaration."""
        req = await self._req_dao.get_by_id(request_id)
        if req.sub_id != sub_user.id:
            raise Forbidden("request does not belong to this sub")
        if req.status != ProfileChangeRequestStatus.awaiting_fee_payment:
            raise Conflict("request is not awaiting fee payment")
        if req.fee_amount is None:
            raise BadRequest("no fee amount set on this request")

        if sub_user.goddess_id is None:
            raise BadRequest("sub is not linked to a goddess")

        method = await self._method_dao.get_by_id(method_id, sub_user.goddess_id)
        if method is None or not method.enabled:
            raise NotFound("payment method not found or disabled")

        decl = await self._decl_dao.create(
            {
                "sub_id": sub_user.id,
                "goddess_id": sub_user.goddess_id,
                "method_id": method_id,
                "amount": req.fee_amount,
                "category": PaymentCategory.profile_change_fee,
                "status": PaymentStatus.pending,
                "created_by": sub_user.id,
                "source": DeclarationSource.sub_declared,
            }
        )
        await self._req_dao.link_fee_payment(req, decl.id)
        return _to_out(req)

    async def on_fee_paid(self, payment_id: UUID) -> None:
        """Called when a profile_change_fee payment is validated. Applies the diff."""
        result = await self._session.execute(
            select(ProfileChangeRequest).where(
                col(ProfileChangeRequest.fee_payment_id) == payment_id
            )
        )
        req = result.scalar_one_or_none()
        if req is None:
            return
        if req.status != ProfileChangeRequestStatus.awaiting_fee_payment:
            return

        await self._apply_diff(req)
        await self._req_dao.set_status(
            req,
            ProfileChangeRequestStatus.approved,
            resolved_at=_now(),
        )

    async def reject(
        self, request_id: UUID, goddess_user: User, payload: GoddessRejectIn
    ) -> ProfileChangeRequestOut:
        """Goddess rejects a pending or awaiting-fee request."""
        req = await self._req_dao.get_by_id(request_id)
        await self._assert_goddess_owns_request(goddess_user, req)
        if req.status not in (
            ProfileChangeRequestStatus.pending,
            ProfileChangeRequestStatus.awaiting_fee_payment,
        ):
            raise Conflict("only pending or awaiting-fee requests can be rejected")

        await self._req_dao.set_status(
            req,
            ProfileChangeRequestStatus.rejected,
            note=payload.note,
            resolved_at=_now(),
        )
        return _to_out(req)

    async def update_payment_handle(
        self, sub_user: User, payload: PaymentHandleIn
    ) -> User:
        """Sub self-edits their payment handle."""
        return await self._user_dao.update_payment_handle(sub_user, payload.payment_handle)

    async def goddess_edit_sub(
        self, goddess_user: User, sub_id: UUID, payload: GoddessEditSubProfileIn
    ) -> User:
        """Goddess directly edits a sub's profile fields (no request flow)."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        sub = await self._user_dao.get_by_id(sub_id)
        if sub is None or sub.goddess_id != goddess_id:
            raise NotFound("sub not found or not linked to this goddess")

        fields: dict[str, object] = {}
        if payload.first_name is not None:
            fields["first_name"] = payload.first_name
        if payload.last_name is not None:
            fields["last_name"] = payload.last_name
        if payload.avatar_key is not None:
            fields["avatar_key"] = payload.avatar_key

        if not fields:
            raise BadRequest("at least one field must be provided")

        return await self._user_dao.update_profile_fields(sub, **fields)

    async def _apply_diff(self, req: ProfileChangeRequest) -> None:
        sub = await self._user_dao.get_by_id(req.sub_id)
        if sub is None:
            raise NotFound("sub user not found")

        fields: dict[str, object] = {}
        if req.proposed_first_name is not None:
            fields["first_name"] = req.proposed_first_name
        if req.proposed_last_name is not None:
            fields["last_name"] = req.proposed_last_name
        if req.proposed_avatar_key is not None:
            fields["avatar_key"] = req.proposed_avatar_key

        if fields:
            await self._user_dao.update_profile_fields(sub, **fields)

    async def _assert_goddess_owns_request(
        self, goddess_user: User, req: ProfileChangeRequest
    ) -> None:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        sub = await self._user_dao.get_by_id(req.sub_id)
        if sub is None or sub.goddess_id != goddess_id:
            raise Forbidden("request does not belong to a sub of this goddess")
