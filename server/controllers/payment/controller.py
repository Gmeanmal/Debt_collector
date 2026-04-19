from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from controllers._goddess import resolve_goddess_user_id
from controllers.payment.helpers import (
    CATEGORY_TO_ALLOCATION_TARGET,
    DEBT_PAYMENT_CATEGORIES,
    check_category_for_sub,
    get_method_for_goddess,
    resolve_goddess_id,
    to_out,
)
from controllers.payment.proof import build_proof_key, strip_exif_if_jpeg
from core.config import get_settings
from core.exceptions import BadRequest, Conflict, Forbidden, NotFound, Validation
from daos.allocation_dao import PaymentAllocationDao
from daos.debt_dao import DebtContractAuditDao, DebtContractDao
from daos.payment_dao import PaymentDeclarationDao
from daos.payment_method_dao import PaymentMethodDao
from daos.rolling_dao import RollingTributeDao
from daos.sub_safeword_dao import SubSafewordDao
from daos.user_dao import UserDao
from models.debt import DebtContractAudit, DebtContractEventType, DebtContractStatus
from models.debt_event import DebtEvent, EventType
from models.notification import NotificationType
from models.payment import (
    DeclarationSource,
    PaymentCategory,
    PaymentDeclaration,
    PaymentStatus,
)
from models.payment_method import PaymentMethod
from models.user import User, UserRole, UserStatus
from schemas.payment import (
    DeclarePaymentIn,
    EditDeclarationIn,
    PaymentOut,
    RecordPaymentIn,
)
from services.notifications.notify import notify
from services.notifications.publisher import publisher
from services.storage import object_store
from utils.ledger import apply_event_and_recompute


class PaymentController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._decl_dao = PaymentDeclarationDao(session)
        self._alloc_dao = PaymentAllocationDao(session)
        self._method_dao = PaymentMethodDao(session)
        self._user_dao = UserDao(session)
        self._rolling_dao = RollingTributeDao(session)
        self._contract_dao = DebtContractDao(session)
        self._audit_dao = DebtContractAuditDao(session)
        self._safeword_dao = SubSafewordDao(session)

    async def _check_rolling_active(self, sub_id: UUID) -> None:
        record = await self._rolling_dao.get_for_sub(sub_id)
        if record is None or Decimal(str(record.amount)) == Decimal("0") or record.paused:
            raise BadRequest("no active rolling tribute configured for this sub")

    async def declare_as_sub(
        self,
        sub_user: User,
        payload: DeclarePaymentIn,
        proof_bytes: bytes,
        proof_mime: str,
    ) -> PaymentOut:
        check_category_for_sub(sub_user, payload.category)
        if payload.category == PaymentCategory.rolling:
            await self._check_rolling_active(sub_user.id)

        if sub_user.goddess_id is None:
            raise BadRequest("sub is not linked to a goddess")

        goddess_id = sub_user.goddess_id
        await get_method_for_goddess(self._method_dao, goddess_id, payload.method_id)

        clean_bytes = strip_exif_if_jpeg(proof_bytes, proof_mime)
        declaration_uuid = uuid4()
        proof_key = build_proof_key(goddess_id, sub_user.id, declaration_uuid, proof_mime)

        settings = get_settings()
        # TODO(DECLARE-follow-up): janitor cron for orphans
        await object_store.upload_object(
            bucket=settings.s3_bucket_payment_proofs,
            key=proof_key,
            body=clean_bytes,
            content_type=proof_mime,
            settings=settings,
        )

        # TODO(DECLARE-follow-up): handle upload/insert race
        decl = await self._decl_dao.create(
            {
                "id": declaration_uuid,
                "sub_id": sub_user.id,
                "goddess_id": goddess_id,
                "method_id": payload.method_id,
                "amount": payload.amount,
                "external_timestamp": payload.external_timestamp,
                "note": payload.note,
                "category": payload.category,
                "status": PaymentStatus.pending,
                "target_id": payload.target_id,
                "created_by": sub_user.id,
                "source": DeclarationSource.sub_declared,
                "proof_key": proof_key,
            }
        )

        goddess_user_id = await resolve_goddess_user_id(self._session, goddess_id)
        if goddess_user_id is not None:
            await notify(
                self._session,
                goddess_user_id,
                NotificationType.payment_pending,
                title="New payment declaration",
                body=f"A sub declared a payment of £{Decimal(str(decl.amount))}.",
                link="/goddess/payments",
                payload={"declaration_id": str(decl.id)},
            )
            # Data: { declaration_id, sub_username, amount, category }
            await publisher.publish_event(
                goddess_user_id,
                "payment_declared",
                {
                    "declaration_id": str(decl.id),
                    "sub_username": sub_user.username,
                    "amount": str(Decimal(str(decl.amount))),
                    "category": decl.category.value,
                },
            )

        return await to_out(self._session, decl)

    async def record_as_goddess(self, goddess_user: User, payload: RecordPaymentIn) -> PaymentOut:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)

        sub = await self._user_dao.get_by_id(payload.sub_id)
        if sub is None or sub.goddess_id != goddess_id:
            raise NotFound("sub not found or not linked to this goddess")

        check_category_for_sub(sub, payload.category)
        if payload.category == PaymentCategory.rolling:
            await self._check_rolling_active(sub.id)
        await get_method_for_goddess(self._method_dao, goddess_id, payload.method_id)

        now = datetime.now(UTC).replace(tzinfo=None)
        decl = await self._decl_dao.create(
            {
                "sub_id": sub.id,
                "goddess_id": goddess_id,
                "method_id": payload.method_id,
                "amount": payload.amount,
                "external_timestamp": payload.external_timestamp,
                "note": payload.note,
                "category": payload.category,
                "status": PaymentStatus.validated,
                "target_id": payload.target_id,
                "created_by": goddess_user.id,
                "validated_by": goddess_user.id,
                "validated_at": now,
                "source": DeclarationSource.goddess_recorded,
            }
        )

        await self._emit_allocation(decl)
        if payload.category == PaymentCategory.entry:
            await self._promote_sub(sub)
        if payload.category == PaymentCategory.rolling:
            await self._rolling_dao.mark_paid(sub.id, now)
        if payload.category in DEBT_PAYMENT_CATEGORIES:
            await self._apply_debt_payment(decl, sub.id)
        if payload.category == PaymentCategory.buyout:
            await self._apply_buyout(decl, sub.id, goddess_user.id, now)

        return await to_out(self._session, decl)

    async def edit_pending_as_sub(
        self, sub_user: User, declaration_id: UUID, patch: EditDeclarationIn
    ) -> PaymentOut:
        decl = await self._get_declaration_or_404(declaration_id)
        if decl.sub_id != sub_user.id:
            raise Forbidden("declaration does not belong to this sub")
        if decl.status != PaymentStatus.pending:
            raise Conflict("only pending declarations can be edited")

        patch_dict = patch.model_dump(exclude_unset=True)

        if "category" in patch_dict:
            check_category_for_sub(sub_user, patch_dict["category"])
            if patch_dict["category"] == PaymentCategory.rolling:
                await self._check_rolling_active(sub_user.id)

        if "method_id" in patch_dict:
            if sub_user.goddess_id is None:
                raise BadRequest("sub is not linked to a goddess")
            await get_method_for_goddess(
                self._method_dao, sub_user.goddess_id, patch_dict["method_id"]
            )

        await self._decl_dao.update(decl, patch_dict)
        return await to_out(self._session, decl)

    async def cancel_pending_as_sub(self, sub_user: User, declaration_id: UUID) -> None:
        decl = await self._get_declaration_or_404(declaration_id)
        if decl.sub_id != sub_user.id:
            raise Forbidden("declaration does not belong to this sub")
        if decl.status != PaymentStatus.pending:
            raise Conflict("only pending declarations can be cancelled")

        await self._decl_dao.mark_cancelled(decl, datetime.now(UTC).replace(tzinfo=None))

    async def validate(
        self,
        goddess_user: User,
        declaration_id: UUID,
        recategorize_to: PaymentCategory | None,
    ) -> PaymentOut:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        decl = await self._get_declaration_or_404(declaration_id)
        if decl.goddess_id != goddess_id:
            raise Forbidden("declaration does not belong to this goddess")
        if decl.status != PaymentStatus.pending:
            raise Conflict("only pending declarations can be validated")

        category = recategorize_to if recategorize_to is not None else decl.category

        sub = await self._user_dao.get_by_id(decl.sub_id)
        if sub is None:
            raise NotFound("sub not found")

        check_category_for_sub(sub, category)
        if category == PaymentCategory.rolling:
            await self._check_rolling_active(decl.sub_id)

        now = datetime.now(UTC).replace(tzinfo=None)
        await self._decl_dao.mark_validated(decl, goddess_user.id, now, category)
        await self._emit_allocation(decl)

        if category == PaymentCategory.entry:
            await self._promote_sub(sub)
        if category == PaymentCategory.rolling:
            await self._rolling_dao.mark_paid(decl.sub_id, now)
        if category in DEBT_PAYMENT_CATEGORIES:
            await self._apply_debt_payment(decl, sub.id)
        if category == PaymentCategory.buyout:
            await self._apply_buyout(decl, sub.id, goddess_user.id, now)

        await notify(
            self._session,
            decl.sub_id,
            NotificationType.payment_validated,
            title="Payment validated",
            body=f"Your payment of £{Decimal(str(decl.amount))} was validated.",
            link="/sub/payments",
            payload={"declaration_id": str(decl.id), "category": category.value},
        )
        # Data: { declaration_id, outcome, reason }
        await publisher.publish_event(
            decl.sub_id,
            "validation_resolved",
            {"declaration_id": str(decl.id), "outcome": "validated", "reason": None},
        )

        return await to_out(self._session, decl)

    async def reject(self, goddess_user: User, declaration_id: UUID, reason: str) -> PaymentOut:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        decl = await self._get_declaration_or_404(declaration_id)
        if decl.goddess_id != goddess_id:
            raise Forbidden("declaration does not belong to this goddess")
        if decl.status != PaymentStatus.pending:
            raise Conflict("only pending declarations can be rejected")

        decl.validated_by = goddess_user.id
        await self._decl_dao.mark_rejected(decl, reason, datetime.now(UTC).replace(tzinfo=None))

        await notify(
            self._session,
            decl.sub_id,
            NotificationType.payment_rejected,
            title="Payment rejected",
            body=f"Your payment of £{decl.amount} was rejected: {reason}",
            link="/sub/payments",
            payload={"declaration_id": str(decl.id)},
        )
        # Data: { declaration_id, outcome, reason }
        await publisher.publish_event(
            decl.sub_id,
            "validation_resolved",
            {"declaration_id": str(decl.id), "outcome": "rejected", "reason": reason},
        )

        return await to_out(self._session, decl)

    async def list_my_history(self, sub_user: User) -> list[PaymentOut]:
        decls = await self._decl_dao.list_for_sub(sub_user.id)
        return [await to_out(self._session, d) for d in decls]

    async def list_pending(self, goddess_user: User) -> list[PaymentOut]:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        decls = await self._decl_dao.list_pending_for_goddess(goddess_id)
        return [await to_out(self._session, d) for d in decls]

    async def list_subs(self, goddess_user: User) -> list[dict[str, Any]]:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        result = await self._session.execute(
            select(User).where(col(User.goddess_id) == goddess_id, col(User.role) == UserRole.sub)
        )
        subs = result.scalars().all()
        return [
            {
                "id": str(s.id),
                "username": s.username,
                "display_name": " ".join(p for p in [s.first_name, s.last_name] if p) or s.username,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "avatar_key": s.avatar_key,
                "status": s.status,
                "real_name": s.real_name,
            }
            for s in subs
        ]

    async def list_sub_payment_methods(self, sub_user: User) -> list[PaymentMethod]:
        if sub_user.goddess_id is None:
            raise BadRequest("sub is not linked to a goddess")
        return await self._method_dao.list_by_goddess(sub_user.goddess_id, enabled_only=True)

    async def _get_declaration_or_404(self, declaration_id: UUID) -> PaymentDeclaration:
        decl = await self._decl_dao.get_by_id(declaration_id)
        if decl is None:
            raise NotFound("declaration not found")
        return decl

    async def _emit_allocation(self, decl: PaymentDeclaration) -> None:
        target_type = CATEGORY_TO_ALLOCATION_TARGET.get(decl.category)
        if target_type is None:
            return
        await self._alloc_dao.create(decl, target_type, decl.target_id)

    async def _promote_sub(self, sub: User) -> None:
        safeword = await self._safeword_dao.get_for_sub(sub.id)
        if safeword is None or not safeword.word.strip():
            raise Validation(
                "A safeword must be set before activating the account.",
                sub_id=str(sub.id),
            )
        sub.status = UserStatus.active
        self._session.add(sub)
        await self._session.flush()

    async def _load_active_contract_for_sub(self, sub_id: UUID, contract_id: UUID | None):
        if contract_id is None:
            raise BadRequest("target_id (contract_id) is required for debt payments")
        contract = await self._contract_dao.get_by_id(contract_id)
        if contract is None or contract.sub_id != sub_id:
            raise BadRequest("contract not found for this sub")
        if contract.status != DebtContractStatus.active:
            raise BadRequest("contract is not active")
        return contract

    async def _apply_debt_payment(self, decl: PaymentDeclaration, sub_id: UUID) -> None:
        await self._load_active_contract_for_sub(sub_id, decl.target_id)
        assert decl.target_id is not None
        event = DebtEvent(
            contract_id=decl.target_id,
            event_type=EventType.payment_applied,
            amount=Decimal(str(decl.amount)),
            note="payment validation",
        )
        await apply_event_and_recompute(self._session, event)

    async def _apply_buyout(
        self, decl: PaymentDeclaration, sub_id: UUID, actor_id: UUID, now: datetime
    ) -> None:
        contract = await self._load_active_contract_for_sub(sub_id, decl.target_id)
        assert decl.target_id is not None
        event = DebtEvent(
            contract_id=decl.target_id,
            event_type=EventType.buyout_paid,
            amount=Decimal(str(decl.amount)),
        )
        await apply_event_and_recompute(self._session, event)

        from_status = contract.status
        contract.status = DebtContractStatus.closed
        contract.updated_at = now
        self._session.add(contract)
        await self._session.flush()

        await self._audit_dao.append(
            DebtContractAudit(
                contract_id=contract.id,
                event_type=DebtContractEventType.closed,
                actor_id=actor_id,
                from_status=from_status,
                to_status=DebtContractStatus.closed,
            )
        )

        goddess_user_id = await resolve_goddess_user_id(self._session, contract.goddess_id)
        if goddess_user_id is not None:
            await notify(
                self._session,
                goddess_user_id,
                NotificationType.contract_buyout_paid,
                title="Contract bought out",
                body=f"Sub paid a buyout of £{Decimal(str(decl.amount))}; contract closed.",
                link=f"/debts/{contract.id}",
                payload={"contract_id": str(contract.id)},
            )

        # Data: { contract_slug, new_state } — emitted to both parties on contract close
        _state_change_data: dict[str, str] = {
            "contract_slug": contract.slug,
            "new_state": contract.status.value,
        }
        for uid in (goddess_user_id, contract.sub_id):
            if uid is not None:
                await publisher.publish_event(uid, "contract_state_change", _state_change_data)
