from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from controllers._goddess import resolve_goddess_id, resolve_goddess_user_id
from controllers.debt.helpers import (
    adjustment_out,
    apply_payload_to_contract,
    apply_version_to_contract,
    contract_out,
    now_utc,
    sub_notification_label,
)
from core.exceptions import BadRequest, Conflict, Forbidden, NotFound
from daos.adjustment_dao import AdjustmentDao
from daos.allocation_dao import ContractPaymentStats, PaymentAllocationDao
from daos.debt_dao import DebtContractAuditDao, DebtContractDao, DebtContractVersionDao
from daos.payment_method_dao import PaymentMethodDao
from daos.user_dao import UserDao
from models.adjustment import AdjustmentStatus, ContractAdjustment
from models.debt import (
    DebtContract,
    DebtContractAudit,
    DebtContractEventType,
    DebtContractStatus,
    DebtContractVersion,
    MidContractAdditionMode,
)
from models.debt_event import DebtEvent, EventType
from models.notification import NotificationType
from models.user import Goddess, User, UserRole
from schemas.adjustment import ContractAdjustmentOut
from schemas.debt import (
    ContractClauseIn,
    DebtContractAuditOut,
    DebtContractCounter,
    DebtContractCreate,
    DebtContractOut,
)
from services.notifications.notify import notify
from services.pdf.generator import generate as generate_contract_pdf
from utils.finance import exit_due
from utils.ledger import apply_event_and_recompute
from utils.periods import current_period_index

_PENDING_STATUSES = {
    DebtContractStatus.pending_sub,
    DebtContractStatus.pending_dom,
    DebtContractStatus.pending_dom_counter,
    DebtContractStatus.pending_sub_signature,
}

# Pre-signature statuses: clauses can be edited freely without triggering re-signature.
_CLAUSES_PRE_SIGN_STATUSES = _PENDING_STATUSES

# Post-signature statuses eligible for the re-signature flow.
_CLAUSES_POST_SIGN_STATUSES = {DebtContractStatus.active}

# Terminal statuses where clauses cannot be edited at all.
_CLAUSES_TERMINAL_STATUSES = {
    DebtContractStatus.closed,
    DebtContractStatus.breached,
    DebtContractStatus.completed,
    DebtContractStatus.cancelled_by_dom,
}


class DebtController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = DebtContractDao(session)
        self._version_dao = DebtContractVersionDao(session)
        self._audit_dao = DebtContractAuditDao(session)
        self._user_dao = UserDao(session)
        self._adjustment_dao = AdjustmentDao(session)
        self._method_dao = PaymentMethodDao(session)
        self._allocation_dao = PaymentAllocationDao(session)

    async def propose_as_goddess(
        self, goddess_user: User, sub_id: UUID, payload: DebtContractCreate
    ) -> DebtContractOut:
        """Goddess initiates a debt contract proposal for a sub."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        await self._assert_sub_belongs_to_goddess(goddess_id, sub_id)

        contract = DebtContract(
            sub_id=sub_id,
            goddess_id=goddess_id,
            sub_initiated=False,
            principal=payload.principal,
            interest_rate=payload.interest_rate,
            interest_period=payload.interest_period,
            duration_periods=payload.duration_periods,
            payment_frequency=payload.payment_frequency,
            minimum_payment=payload.minimum_payment,
            late_penalty_severity=payload.late_penalty_severity,
            late_penalty_percent=payload.late_penalty_percent,
            dom_can_add_surprise_penalty=payload.dom_can_add_surprise_penalty,
            mid_contract_addition_mode=payload.mid_contract_addition_mode,
            exit_amount=payload.exit_amount,
            status=DebtContractStatus.pending_sub,
            balance=payload.principal,
        )
        contract = await self._dao.create(contract)

        version = await self._version_dao.create(
            DebtContractVersion(
                contract_id=contract.id,
                round_no=0,
                proposed_by=goddess_user.id,
                principal=payload.principal,
                interest_rate=payload.interest_rate,
                interest_period=payload.interest_period,
                duration_periods=payload.duration_periods,
                payment_frequency=payload.payment_frequency,
                minimum_payment=payload.minimum_payment,
                late_penalty_severity=payload.late_penalty_severity,
                late_penalty_percent=payload.late_penalty_percent,
                dom_can_add_surprise_penalty=payload.dom_can_add_surprise_penalty,
                mid_contract_addition_mode=payload.mid_contract_addition_mode,
                exit_amount=payload.exit_amount,
            )
        )

        contract.current_version_id = version.id
        contract.updated_at = now_utc()
        contract = await self._dao.save(contract)

        await self._audit_dao.append(
            DebtContractAudit(
                contract_id=contract.id,
                event_type=DebtContractEventType.proposed,
                actor_id=goddess_user.id,
                from_status=None,
                to_status=DebtContractStatus.pending_sub,
            )
        )

        await notify(
            self._session,
            sub_id,
            NotificationType.contract_proposed,
            title="New contract proposed",
            body="Your goddess proposed a new debt contract for you to review.",
            link=f"/debts/{contract.id}",
            payload={"contract_id": str(contract.id)},
        )

        stats = await self._stats_for(contract)
        return contract_out(contract, version, stats)

    async def propose_as_sub(self, sub_user: User, payload: DebtContractCreate) -> DebtContractOut:
        """Sub initiates a debt contract proposal directed at their goddess."""
        if sub_user.goddess_id is None:
            raise BadRequest("sub is not linked to a goddess")
        goddess_id = sub_user.goddess_id

        contract = DebtContract(
            sub_id=sub_user.id,
            goddess_id=goddess_id,
            sub_initiated=True,
            principal=payload.principal,
            interest_rate=payload.interest_rate,
            interest_period=payload.interest_period,
            duration_periods=payload.duration_periods,
            payment_frequency=payload.payment_frequency,
            minimum_payment=payload.minimum_payment,
            late_penalty_severity=payload.late_penalty_severity,
            late_penalty_percent=payload.late_penalty_percent,
            dom_can_add_surprise_penalty=payload.dom_can_add_surprise_penalty,
            mid_contract_addition_mode=payload.mid_contract_addition_mode,
            exit_amount=payload.exit_amount,
            status=DebtContractStatus.pending_dom,
            balance=payload.principal,
        )
        contract = await self._dao.create(contract)

        version = await self._version_dao.create(
            DebtContractVersion(
                contract_id=contract.id,
                round_no=0,
                proposed_by=sub_user.id,
                principal=payload.principal,
                interest_rate=payload.interest_rate,
                interest_period=payload.interest_period,
                duration_periods=payload.duration_periods,
                payment_frequency=payload.payment_frequency,
                minimum_payment=payload.minimum_payment,
                late_penalty_severity=payload.late_penalty_severity,
                late_penalty_percent=payload.late_penalty_percent,
                dom_can_add_surprise_penalty=payload.dom_can_add_surprise_penalty,
                mid_contract_addition_mode=payload.mid_contract_addition_mode,
                exit_amount=payload.exit_amount,
            )
        )

        contract.current_version_id = version.id
        contract.updated_at = now_utc()
        contract = await self._dao.save(contract)

        await self._audit_dao.append(
            DebtContractAudit(
                contract_id=contract.id,
                event_type=DebtContractEventType.proposed,
                actor_id=sub_user.id,
                from_status=None,
                to_status=DebtContractStatus.pending_dom,
            )
        )

        goddess_user_id = await resolve_goddess_user_id(self._session, goddess_id)
        if goddess_user_id is not None:
            await notify(
                self._session,
                goddess_user_id,
                NotificationType.contract_proposed,
                title="Sub proposed a contract",
                body="Your sub proposed a new debt contract.",
                link=f"/debts/{contract.id}",
                payload={"contract_id": str(contract.id)},
            )

        stats = await self._stats_for(contract)
        return contract_out(contract, version, stats)

    async def counter_propose(
        self, actor: User, contract_id: UUID, payload: DebtContractCounter
    ) -> DebtContractOut:
        """Sub or goddess counter-proposes on an in-negotiation contract."""
        contract = await self._get_contract_or_404(contract_id)

        versions = await self._version_dao.list_for_contract(contract_id)
        if any(v.round_no >= 1 for v in versions):
            raise Conflict("negotiation limit reached — one counter per side")

        from_status = contract.status

        if actor.role == UserRole.sub:
            if contract.sub_id != actor.id:
                raise Forbidden("contract does not belong to this sub")
            if contract.status != DebtContractStatus.pending_sub:
                raise Conflict("sub can only counter-propose when status is pending_sub")
            to_status = DebtContractStatus.pending_dom_counter

        elif actor.role == UserRole.goddess:
            goddess_id = await resolve_goddess_id(self._session, actor.id)
            if contract.goddess_id != goddess_id:
                raise Forbidden("contract does not belong to this goddess")
            if contract.status != DebtContractStatus.pending_dom:
                raise Conflict("goddess can only counter-propose when status is pending_dom")
            to_status = DebtContractStatus.pending_sub_signature

        else:
            raise Forbidden("only sub or goddess users may counter-propose")

        version = await self._version_dao.create(
            DebtContractVersion(
                contract_id=contract.id,
                round_no=1,
                proposed_by=actor.id,
                principal=payload.principal,
                interest_rate=payload.interest_rate,
                interest_period=payload.interest_period,
                duration_periods=payload.duration_periods,
                payment_frequency=payload.payment_frequency,
                minimum_payment=payload.minimum_payment,
                late_penalty_severity=payload.late_penalty_severity,
                late_penalty_percent=payload.late_penalty_percent,
                dom_can_add_surprise_penalty=payload.dom_can_add_surprise_penalty,
                mid_contract_addition_mode=payload.mid_contract_addition_mode,
                exit_amount=payload.exit_amount,
            )
        )

        apply_payload_to_contract(contract, payload)
        contract.balance = payload.principal
        contract.current_version_id = version.id
        contract.status = to_status
        contract.updated_at = now_utc()
        await self._dao.save(contract)

        await self._audit_dao.append(
            DebtContractAudit(
                contract_id=contract.id,
                event_type=DebtContractEventType.countered,
                actor_id=actor.id,
                from_status=from_status,
                to_status=to_status,
            )
        )

        counter_party_id: UUID | None
        if actor.role == UserRole.sub:
            counter_party_id = await resolve_goddess_user_id(self._session, contract.goddess_id)
        else:
            counter_party_id = contract.sub_id
        if counter_party_id is not None:
            await notify(
                self._session,
                counter_party_id,
                NotificationType.contract_countered,
                title="Contract counter-proposed",
                body="The other party counter-proposed the contract terms.",
                link=f"/debts/{contract.id}",
                payload={"contract_id": str(contract.id)},
            )

        stats = await self._stats_for(contract)
        return contract_out(contract, version, stats)

    async def accept_counter(self, goddess_user: User, contract_id: UUID) -> DebtContractOut:
        """Goddess accepts the sub's counter-proposal, moving to pending_sub_signature."""
        contract = await self._get_contract_or_404(contract_id)
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)

        if contract.goddess_id != goddess_id:
            raise Forbidden("contract does not belong to this goddess")
        if contract.status != DebtContractStatus.pending_dom_counter:
            raise Conflict("accept_counter only valid when status is pending_dom_counter")

        from_status = contract.status
        contract.status = DebtContractStatus.pending_sub_signature
        contract.updated_at = now_utc()
        await self._dao.save(contract)

        current_version = await self._load_current_version(contract)

        await self._audit_dao.append(
            DebtContractAudit(
                contract_id=contract.id,
                event_type=DebtContractEventType.accepted_counter,
                actor_id=goddess_user.id,
                from_status=from_status,
                to_status=DebtContractStatus.pending_sub_signature,
            )
        )

        await notify(
            self._session,
            contract.sub_id,
            NotificationType.contract_counter_accepted,
            title="Counter-proposal accepted",
            body="Your goddess accepted your counter-proposal. Sign to activate the contract.",
            link=f"/debts/{contract.id}",
            payload={"contract_id": str(contract.id)},
        )

        stats = await self._stats_for(contract)
        return contract_out(contract, current_version, stats)

    async def reject_counter(self, goddess_user: User, contract_id: UUID) -> DebtContractOut:
        """Goddess rejects the sub's counter, reverting to the original terms for sub to sign."""
        contract = await self._get_contract_or_404(contract_id)
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)

        if contract.goddess_id != goddess_id:
            raise Forbidden("contract does not belong to this goddess")
        if contract.status != DebtContractStatus.pending_dom_counter:
            raise Conflict("reject_counter only valid when status is pending_dom_counter")

        versions = await self._version_dao.list_for_contract(contract_id)
        original = next((v for v in versions if v.round_no == 0), None)
        if original is None:
            raise NotFound("original version (round 0) not found")

        apply_version_to_contract(contract, original)
        contract.balance = original.principal
        contract.current_version_id = original.id
        from_status = contract.status
        contract.status = DebtContractStatus.pending_sub_signature
        contract.updated_at = now_utc()
        await self._dao.save(contract)

        await self._audit_dao.append(
            DebtContractAudit(
                contract_id=contract.id,
                event_type=DebtContractEventType.rejected_counter,
                actor_id=goddess_user.id,
                from_status=from_status,
                to_status=DebtContractStatus.pending_sub_signature,
            )
        )

        await notify(
            self._session,
            contract.sub_id,
            NotificationType.contract_counter_rejected,
            title="Counter-proposal rejected",
            body="Your goddess rejected your counter. Original terms restored — sign to activate.",
            link=f"/debts/{contract.id}",
            payload={"contract_id": str(contract.id)},
        )

        stats = await self._stats_for(contract)
        return contract_out(contract, original, stats)

    async def sign_as_sub(
        self, sub_user: User, contract_id: UUID, signature_b64: str
    ) -> DebtContractOut:
        """Sub signs the finalised contract, activating it and persisting the signature."""
        contract = await self._get_contract_or_404(contract_id)

        if contract.sub_id != sub_user.id:
            raise Forbidden("contract does not belong to this sub")

        valid_sign_statuses = {
            DebtContractStatus.pending_sub,
            DebtContractStatus.pending_sub_signature,
        }
        if contract.status not in valid_sign_statuses:
            raise Conflict("contract is not in a signable state")

        sub_display = sub_notification_label(sub_user)
        from_status = contract.status
        signed_at = now_utc()
        contract.status = DebtContractStatus.active
        contract.signed_at = signed_at
        contract.signature_b64 = signature_b64
        contract.updated_at = signed_at
        await self._dao.save(contract)

        current_version = await self._load_current_version(contract)

        await self._audit_dao.append(
            DebtContractAudit(
                contract_id=contract.id,
                event_type=DebtContractEventType.signed,
                actor_id=sub_user.id,
                from_status=from_status,
                to_status=DebtContractStatus.active,
            )
        )

        goddess_user_id = await resolve_goddess_user_id(self._session, contract.goddess_id)
        if goddess_user_id is not None:
            await notify(
                self._session,
                goddess_user_id,
                NotificationType.contract_signed,
                title="Contract signed",
                body=f"{sub_display} signed the contract; it is now active.",
                link=f"/debts/{contract.id}",
                payload={"contract_id": str(contract.id)},
            )

        stats = await self._stats_for(contract)
        return contract_out(contract, current_version, stats)

    async def generate_contract_pdf_bytes(
        self, viewer: User, contract_id: UUID, draft: bool = False
    ) -> bytes:
        """Render the contract PDF on-the-fly and return raw bytes.

        When the contract is signed, the stored signature_b64 is embedded.
        When unsigned, renders a draft preview (no signature, draft watermark when draft=True).
        Auth/ownership checks are the caller's responsibility.
        """
        contract = await self._get_contract_or_404(contract_id)
        await self._assert_viewer_can_see(viewer, contract)

        goddess = await self._session.get(Goddess, contract.goddess_id)
        if goddess is None:
            raise NotFound("goddess profile not found for this contract")

        sub_user = await self._session.get(User, contract.sub_id)
        if sub_user is None:
            raise NotFound("sub user not found for this contract")

        pdf_bytes, _ = generate_contract_pdf(
            contract=contract,
            goddess=goddess,
            sub_user=sub_user,
            signature_b64=contract.signature_b64,
            signed_at=contract.signed_at,
            draft=draft,
        )
        return pdf_bytes

    async def close_as_goddess(self, goddess_user: User, contract_id: UUID) -> DebtContractOut:
        """Goddess cancels a pending contract."""
        contract = await self._get_contract_or_404(contract_id)
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)

        if contract.goddess_id != goddess_id:
            raise Forbidden("contract does not belong to this goddess")
        if contract.status not in _PENDING_STATUSES:
            raise Conflict("only pending contracts can be closed by the goddess")

        from_status = contract.status
        contract.status = DebtContractStatus.cancelled_by_dom
        contract.updated_at = now_utc()
        await self._dao.save(contract)

        current_version = await self._load_current_version(contract)

        await self._audit_dao.append(
            DebtContractAudit(
                contract_id=contract.id,
                event_type=DebtContractEventType.cancelled,
                actor_id=goddess_user.id,
                from_status=from_status,
                to_status=DebtContractStatus.cancelled_by_dom,
            )
        )

        stats = await self._stats_for(contract)
        return contract_out(contract, current_version, stats)

    async def update_clauses(
        self,
        goddess_user: User,
        contract_id: UUID,
        clauses: list[ContractClauseIn],
    ) -> DebtContractOut:
        """Replace the clauses array on a contract; trigger re-signature when signed."""
        contract = await self._get_contract_or_404(contract_id)
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        if contract.goddess_id != goddess_id:
            raise Forbidden("contract does not belong to this goddess")
        if contract.status in _CLAUSES_TERMINAL_STATUSES:
            raise Conflict("clauses cannot be edited on a terminal contract")

        normalized = _normalize_clauses(clauses)
        existing = _stored_clauses_signature(contract.clauses_json)
        incoming = _normalized_clauses_signature(normalized)
        clauses_changed = existing != incoming

        from_status = contract.status
        trigger_resign = clauses_changed and contract.status in _CLAUSES_POST_SIGN_STATUSES

        contract.clauses_json = [
            {
                "id": str(c["id"]),
                "label": c["label"],
                "body": c["body"],
                "sort_order": c["sort_order"],
            }
            for c in normalized
        ]
        contract.updated_at = now_utc()

        if trigger_resign:
            contract.status = DebtContractStatus.pending_sub_signature
            contract.signed_at = None
            contract.signature_b64 = None

        await self._dao.save(contract)

        if clauses_changed:
            await self._audit_dao.append(
                DebtContractAudit(
                    contract_id=contract.id,
                    event_type=DebtContractEventType.clauses_changed,
                    actor_id=goddess_user.id,
                    from_status=from_status,
                    to_status=contract.status,
                )
            )

        if trigger_resign:
            await notify(
                self._session,
                contract.sub_id,
                NotificationType.contract_needs_resignature,
                title="Contract clauses changed",
                body=(
                    "Your goddess updated the contract clauses. "
                    "Please review and sign again to re-activate the contract."
                ),
                link=f"/debts/{contract.id}",
                payload={"contract_id": str(contract.id)},
            )

        current_version = await self._load_current_version(contract)
        stats = await self._stats_for(contract)
        return contract_out(contract, current_version, stats)

    async def get(self, viewer: User, contract_id: UUID) -> DebtContractOut:
        """Return a contract, enforcing visibility rules."""
        contract = await self._get_contract_or_404(contract_id)
        await self._assert_viewer_can_see(viewer, contract)
        current_version = await self._load_current_version(contract)
        stats = await self._stats_for(contract)
        return contract_out(contract, current_version, stats)

    async def get_by_slug_as_goddess(self, goddess_user: User, slug: str) -> DebtContractOut:
        """Return a contract identified by slug, enforcing goddess ownership."""
        contract = await self._dao.get_by_slug(slug)
        if contract is None:
            raise NotFound("debt contract not found")
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        if contract.goddess_id != goddess_id:
            raise Forbidden("contract does not belong to this goddess")
        current_version = await self._load_current_version(contract)
        stats = await self._stats_for(contract)
        return contract_out(contract, current_version, stats)

    async def get_by_slug_as_sub(self, sub_user: User, slug: str) -> DebtContractOut:
        """Return a contract identified by slug, enforcing sub ownership."""
        contract = await self._dao.get_by_slug(slug)
        if contract is None:
            raise NotFound("debt contract not found")
        if contract.sub_id != sub_user.id:
            raise Forbidden("contract does not belong to this sub")
        current_version = await self._load_current_version(contract)
        stats = await self._stats_for(contract)
        return contract_out(contract, current_version, stats)

    async def list_for_viewer(self, viewer: User) -> list[DebtContractOut]:
        """Return all contracts visible to the viewer based on their role."""
        if viewer.role == UserRole.sub:
            contracts = await self._dao.list_for_sub(viewer.id)
        else:
            goddess_id = await resolve_goddess_id(self._session, viewer.id)
            contracts = await self._dao.list_for_goddess(goddess_id)

        result: list[DebtContractOut] = []
        for c in contracts:
            version = await self._load_current_version(c)
            stats = await self._stats_for(c)
            result.append(contract_out(c, version, stats))
        return result

    async def list_audit(self, viewer: User, contract_id: UUID) -> list[DebtContractAuditOut]:
        """Return audit trail for a contract, enforcing the same visibility rules as get."""
        contract = await self._get_contract_or_404(contract_id)
        await self._assert_viewer_can_see(viewer, contract)
        rows = await self._audit_dao.list_for_contract(contract_id)
        return [
            DebtContractAuditOut(
                id=r.id,
                contract_id=r.contract_id,
                event_type=r.event_type,
                actor_id=r.actor_id,
                from_status=r.from_status,
                to_status=r.to_status,
                note=r.note,
                created_at=r.created_at,
            )
            for r in rows
        ]

    async def buyout_intent(self, sub_user: User, contract_id: UUID) -> dict[str, object]:
        contract = await self._get_contract_or_404(contract_id)
        if contract.sub_id != sub_user.id:
            raise Forbidden("contract does not belong to this sub")
        if contract.status != DebtContractStatus.active:
            raise Conflict("buyout only available on active contracts")

        elapsed = current_period_index(contract, now_utc())
        amount = exit_due(contract, elapsed)

        methods = await self._method_dao.list_by_goddess(contract.goddess_id, enabled_only=True)
        return {"exit_amount": amount, "payment_methods": methods}

    async def surprise_penalty(
        self,
        goddess_user: User,
        contract_id: UUID,
        amount: Decimal,
        reason: str | None,
    ) -> DebtContractOut:
        contract = await self._get_contract_or_404(contract_id)
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        if contract.goddess_id != goddess_id:
            raise Forbidden("contract does not belong to this goddess")
        if not contract.dom_can_add_surprise_penalty:
            raise Forbidden("surprise penalty not enabled on this contract")
        if contract.status != DebtContractStatus.active:
            raise Conflict("surprise penalty only allowed on active contracts")

        event = DebtEvent(
            contract_id=contract.id,
            event_type=EventType.surprise_penalty,
            amount=amount,
            note=reason,
        )
        await apply_event_and_recompute(self._session, event)

        contract.updated_at = now_utc()
        await self._dao.save(contract)
        current_version = await self._load_current_version(contract)

        await notify(
            self._session,
            contract.sub_id,
            NotificationType.contract_surprise_penalty,
            title="Surprise penalty applied",
            body=reason or f"A surprise penalty of £{amount} was added to your contract.",
            link=f"/debts/{contract.id}",
            payload={"contract_id": str(contract.id), "amount": str(amount)},
        )

        stats = await self._stats_for(contract)
        return contract_out(contract, current_version, stats)

    async def create_adjustment(
        self,
        goddess_user: User,
        contract_id: UUID,
        amount: Decimal,
        reason: str | None,
    ) -> ContractAdjustmentOut:
        contract = await self._get_contract_or_404(contract_id)
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        if contract.goddess_id != goddess_id:
            raise Forbidden("contract does not belong to this goddess")
        if contract.status != DebtContractStatus.active:
            raise Conflict("adjustments only allowed on active contracts")

        mode = contract.mid_contract_addition_mode
        if mode == MidContractAdditionMode.disabled:
            raise Forbidden("mid-contract additions disabled on this contract")

        now = now_utc()
        if mode == MidContractAdditionMode.dom_controlled:
            status = AdjustmentStatus.applied
        else:
            status = AdjustmentStatus.pending_sub_approval

        adjustment = ContractAdjustment(
            contract_id=contract.id,
            proposed_by=goddess_user.id,
            amount=amount,
            reason=reason,
            status=status,
            created_at=now,
            updated_at=now,
            resolved_at=now if status == AdjustmentStatus.applied else None,
        )
        adjustment = await self._adjustment_dao.create(adjustment)

        if status == AdjustmentStatus.applied:
            await self._emit_adjustment_event(contract.id, amount, reason)
        else:
            await notify(
                self._session,
                contract.sub_id,
                NotificationType.contract_adjustment_proposed,
                title="Adjustment proposed",
                body=reason or f"Your goddess proposed an adjustment of £{amount}.",
                link=f"/debts/{contract.id}",
                payload={"contract_id": str(contract.id), "adjustment_id": str(adjustment.id)},
            )

        return adjustment_out(adjustment)

    async def accept_adjustment(self, sub_user: User, adjustment_id: UUID) -> ContractAdjustmentOut:
        adjustment = await self._adjustment_dao.get(adjustment_id)
        if adjustment is None:
            raise NotFound("adjustment not found")
        contract = await self._get_contract_or_404(adjustment.contract_id)
        if contract.sub_id != sub_user.id:
            raise Forbidden("adjustment does not belong to this sub")
        if adjustment.status != AdjustmentStatus.pending_sub_approval:
            raise Conflict("adjustment is not pending sub approval")

        now = now_utc()
        adjustment.status = AdjustmentStatus.accepted
        adjustment.updated_at = now
        adjustment.resolved_at = now
        await self._adjustment_dao.save(adjustment)

        await self._emit_adjustment_event(
            contract.id, Decimal(str(adjustment.amount)), adjustment.reason
        )

        goddess_user_id = await resolve_goddess_user_id(self._session, contract.goddess_id)
        if goddess_user_id is not None:
            await notify(
                self._session,
                goddess_user_id,
                NotificationType.contract_adjustment_accepted,
                title="Adjustment accepted",
                body="Your sub accepted the adjustment.",
                link=f"/debts/{contract.id}",
                payload={"contract_id": str(contract.id), "adjustment_id": str(adjustment.id)},
            )

        return adjustment_out(adjustment)

    async def refuse_adjustment(self, sub_user: User, adjustment_id: UUID) -> ContractAdjustmentOut:
        adjustment = await self._adjustment_dao.get(adjustment_id)
        if adjustment is None:
            raise NotFound("adjustment not found")
        contract = await self._get_contract_or_404(adjustment.contract_id)
        if contract.sub_id != sub_user.id:
            raise Forbidden("adjustment does not belong to this sub")
        if adjustment.status != AdjustmentStatus.pending_sub_approval:
            raise Conflict("adjustment is not pending sub approval")

        now = now_utc()
        adjustment.status = AdjustmentStatus.refused
        adjustment.updated_at = now
        adjustment.resolved_at = now
        await self._adjustment_dao.save(adjustment)

        goddess_user_id = await resolve_goddess_user_id(self._session, contract.goddess_id)
        if goddess_user_id is not None:
            await notify(
                self._session,
                goddess_user_id,
                NotificationType.contract_adjustment_refused,
                title="Adjustment refused",
                body="Your sub refused the proposed adjustment.",
                link=f"/debts/{contract.id}",
                payload={"contract_id": str(contract.id), "adjustment_id": str(adjustment.id)},
            )

        return adjustment_out(adjustment)

    async def list_pending_adjustments(self, sub_user: User) -> list[ContractAdjustmentOut]:
        rows = await self._adjustment_dao.list_pending_for_sub(sub_user.id)
        return [adjustment_out(r) for r in rows]

    async def _emit_adjustment_event(
        self, contract_id: UUID, amount: Decimal, reason: str | None
    ) -> None:
        event = DebtEvent(
            contract_id=contract_id,
            event_type=EventType.adjustment,
            amount=amount,
            note=reason,
        )
        await apply_event_and_recompute(self._session, event)

    async def _load_current_version(self, contract: DebtContract) -> DebtContractVersion | None:
        if contract.current_version_id is None:
            return None
        return await self._version_dao.get_by_id(contract.current_version_id)

    async def _stats_for(self, contract: DebtContract) -> ContractPaymentStats:
        return await self._allocation_dao.stats_for_contract(contract.id)

    async def _get_contract_or_404(self, contract_id: UUID) -> DebtContract:
        contract = await self._dao.get_by_id(contract_id)
        if contract is None:
            raise NotFound("debt contract not found")
        return contract

    async def _assert_sub_belongs_to_goddess(self, goddess_id: UUID, sub_id: UUID) -> None:
        result = await self._session.execute(
            select(User).where(
                col(User.id) == sub_id,
                col(User.goddess_id) == goddess_id,
            )
        )
        if result.scalar_one_or_none() is None:
            raise NotFound("sub not found or not linked to this goddess")

    async def _assert_viewer_can_see(self, viewer: User, contract: DebtContract) -> None:
        if viewer.role == UserRole.sub:
            if contract.sub_id != viewer.id:
                raise Forbidden("contract does not belong to this sub")
        elif viewer.role == UserRole.goddess:
            goddess_id = await resolve_goddess_id(self._session, viewer.id)
            if contract.goddess_id != goddess_id:
                raise Forbidden("contract does not belong to this goddess")
        else:
            raise Forbidden("only sub or goddess users may view contracts")


NormalizedClause = dict[str, object]


def _normalize_clauses(clauses: list[ContractClauseIn]) -> list[NormalizedClause]:
    """Assign fresh UUIDs where missing and densify ``sort_order`` to 0..N-1."""
    result: list[NormalizedClause] = []
    for index, clause in enumerate(clauses):
        clause_id = clause.id if clause.id is not None else uuid4()
        result.append(
            {
                "id": clause_id,
                "label": clause.label,
                "body": clause.body,
                "sort_order": index,
            }
        )
    return result


def _normalized_clauses_signature(
    clauses: list[NormalizedClause],
) -> list[tuple[str, str, int]]:
    """Content-only signature (label, body, sort_order) ignoring ids."""
    signature: list[tuple[str, str, int]] = []
    for clause in clauses:
        label = clause["label"]
        body = clause["body"]
        sort_order = clause["sort_order"]
        if not isinstance(label, str) or not isinstance(body, str):
            continue
        if not isinstance(sort_order, int):
            continue
        signature.append((label, body, sort_order))
    return sorted(signature, key=lambda t: t[2])


def _stored_clauses_signature(
    raw: list[dict[str, object]],
) -> list[tuple[str, str, int]]:
    """Content-only signature extracted from a persisted ``clauses_json`` blob."""
    signature: list[tuple[str, str, int]] = []
    for entry in raw or []:
        label = entry.get("label")
        body = entry.get("body")
        sort_order = entry.get("sort_order")
        if not isinstance(label, str) or not isinstance(body, str):
            continue
        if not isinstance(sort_order, int):
            continue
        signature.append((label, body, sort_order))
    return sorted(signature, key=lambda t: t[2])
