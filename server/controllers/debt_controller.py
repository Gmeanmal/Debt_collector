from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from controllers._goddess import resolve_goddess_id
from core.exceptions import BadRequest, Conflict, Forbidden, NotFound
from daos.debt_dao import DebtContractAuditDao, DebtContractDao, DebtContractVersionDao
from daos.user_dao import UserDao
from models.debt import (
    DebtContract,
    DebtContractAudit,
    DebtContractEventType,
    DebtContractStatus,
    DebtContractVersion,
)
from models.user import Goddess, User, UserRole
from schemas.debt import (
    DebtContractAuditOut,
    DebtContractCounter,
    DebtContractCreate,
    DebtContractOut,
    DebtContractVersionOut,
)
from services.pdf.generator import generate as generate_contract_pdf
from services.storage.factory import get_storage_service

_PENDING_STATUSES = {
    DebtContractStatus.pending_sub,
    DebtContractStatus.pending_dom,
    DebtContractStatus.pending_dom_counter,
    DebtContractStatus.pending_sub_signature,
}


def _now_utc() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _user_display_name(user: User) -> str:
    first = (user.first_name or "").strip()
    last = (user.last_name or "").strip()
    full = f"{first} {last}".strip()
    if full:
        return full
    if user.username:
        return user.username
    return user.email


def _version_out(version: DebtContractVersion) -> DebtContractVersionOut:
    return DebtContractVersionOut(
        id=version.id,
        contract_id=version.contract_id,
        round_no=version.round_no,
        proposed_by=version.proposed_by,
        proposed_at=version.proposed_at,
        principal=Decimal(str(version.principal)),
        interest_rate=Decimal(str(version.interest_rate)),
        interest_period=version.interest_period,
        duration_periods=version.duration_periods,
        payment_frequency=version.payment_frequency,
        minimum_payment=Decimal(str(version.minimum_payment)),
        late_penalty_severity=version.late_penalty_severity,
        late_penalty_percent=Decimal(str(version.late_penalty_percent)),
        dom_can_add_surprise_penalty=version.dom_can_add_surprise_penalty,
        mid_contract_addition_mode=version.mid_contract_addition_mode,
        exit_amount=Decimal(str(version.exit_amount)),
    )


def _contract_out(
    contract: DebtContract, current_version: DebtContractVersion | None
) -> DebtContractOut:
    version_out = _version_out(current_version) if current_version is not None else None
    return DebtContractOut(
        id=contract.id,
        sub_id=contract.sub_id,
        goddess_id=contract.goddess_id,
        sub_initiated=contract.sub_initiated,
        principal=Decimal(str(contract.principal)),
        interest_rate=Decimal(str(contract.interest_rate)),
        interest_period=contract.interest_period,
        duration_periods=contract.duration_periods,
        payment_frequency=contract.payment_frequency,
        minimum_payment=Decimal(str(contract.minimum_payment)),
        late_penalty_severity=contract.late_penalty_severity,
        late_penalty_percent=Decimal(str(contract.late_penalty_percent)),
        dom_can_add_surprise_penalty=contract.dom_can_add_surprise_penalty,
        mid_contract_addition_mode=contract.mid_contract_addition_mode,
        exit_amount=Decimal(str(contract.exit_amount)),
        status=contract.status,
        current_version=version_out,
        signed_pdf_url=contract.signed_pdf_url,
        signed_pdf_sha256=contract.signed_pdf_sha256,
        signed_at=contract.signed_at,
        balance=Decimal(str(contract.balance)),
        created_at=contract.created_at,
        updated_at=contract.updated_at,
    )


def _apply_payload_to_contract(contract: DebtContract, payload: DebtContractCounter) -> None:
    contract.principal = payload.principal
    contract.interest_rate = payload.interest_rate
    contract.interest_period = payload.interest_period
    contract.duration_periods = payload.duration_periods
    contract.payment_frequency = payload.payment_frequency
    contract.minimum_payment = payload.minimum_payment
    contract.late_penalty_severity = payload.late_penalty_severity
    contract.late_penalty_percent = payload.late_penalty_percent
    contract.dom_can_add_surprise_penalty = payload.dom_can_add_surprise_penalty
    contract.mid_contract_addition_mode = payload.mid_contract_addition_mode
    contract.exit_amount = payload.exit_amount


def _apply_version_to_contract(contract: DebtContract, version: DebtContractVersion) -> None:
    contract.principal = version.principal
    contract.interest_rate = version.interest_rate
    contract.interest_period = version.interest_period
    contract.duration_periods = version.duration_periods
    contract.payment_frequency = version.payment_frequency
    contract.minimum_payment = version.minimum_payment
    contract.late_penalty_severity = version.late_penalty_severity
    contract.late_penalty_percent = version.late_penalty_percent
    contract.dom_can_add_surprise_penalty = version.dom_can_add_surprise_penalty
    contract.mid_contract_addition_mode = version.mid_contract_addition_mode
    contract.exit_amount = version.exit_amount


class DebtController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = DebtContractDao(session)
        self._version_dao = DebtContractVersionDao(session)
        self._audit_dao = DebtContractAuditDao(session)
        self._user_dao = UserDao(session)

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
        contract.updated_at = _now_utc()
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

        return _contract_out(contract, version)

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
        contract.updated_at = _now_utc()
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

        return _contract_out(contract, version)

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

        _apply_payload_to_contract(contract, payload)
        contract.balance = payload.principal
        contract.current_version_id = version.id
        contract.status = to_status
        contract.updated_at = _now_utc()
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

        return _contract_out(contract, version)

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
        contract.updated_at = _now_utc()
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

        return _contract_out(contract, current_version)

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

        _apply_version_to_contract(contract, original)
        contract.balance = original.principal
        contract.current_version_id = original.id
        from_status = contract.status
        contract.status = DebtContractStatus.pending_sub_signature
        contract.updated_at = _now_utc()
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

        return _contract_out(contract, original)

    async def sign_as_sub(
        self, sub_user: User, contract_id: UUID, signature_png_b64: str
    ) -> DebtContractOut:
        """Sub signs the finalised contract, activating it and generating the signed PDF."""
        contract = await self._get_contract_or_404(contract_id)

        if contract.sub_id != sub_user.id:
            raise Forbidden("contract does not belong to this sub")

        valid_sign_statuses = {
            DebtContractStatus.pending_sub,
            DebtContractStatus.pending_sub_signature,
        }
        if contract.status not in valid_sign_statuses:
            raise Conflict("contract is not in a signable state")

        goddess = await self._session.get(Goddess, contract.goddess_id)
        if goddess is None:
            raise NotFound("goddess profile not found for this contract")

        goddess_name = goddess.display_name
        sub_full_name = _user_display_name(sub_user)

        from_status = contract.status
        signed_at = _now_utc()
        contract.status = DebtContractStatus.active
        contract.signed_at = signed_at
        contract.updated_at = signed_at

        pdf_bytes, sha = generate_contract_pdf(
            contract,
            goddess_name,
            sub_full_name,
            signature_png_b64,
            signed_at.isoformat(),
        )

        storage = get_storage_service()
        key = f"contracts/{contract.goddess_id}/{contract.id}.pdf"
        await storage.upload_pdf(key=key, data=pdf_bytes)

        contract.signed_pdf_url = key
        contract.signed_pdf_sha256 = sha
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

        return _contract_out(contract, current_version)

    async def download_pdf(self, viewer: User, contract_id: UUID) -> str:
        """Return a presigned download URL for the contract's signed PDF."""
        contract = await self._get_contract_or_404(contract_id)
        await self._assert_viewer_can_see(viewer, contract)

        if contract.signed_pdf_url is None:
            raise NotFound("contract has no signed PDF")

        storage = get_storage_service()
        return await storage.presign_download(contract.signed_pdf_url)

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
        contract.updated_at = _now_utc()
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

        return _contract_out(contract, current_version)

    async def get(self, viewer: User, contract_id: UUID) -> DebtContractOut:
        """Return a contract, enforcing visibility rules."""
        contract = await self._get_contract_or_404(contract_id)
        await self._assert_viewer_can_see(viewer, contract)
        current_version = await self._load_current_version(contract)
        return _contract_out(contract, current_version)

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
            result.append(_contract_out(c, version))
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

    async def _load_current_version(self, contract: DebtContract) -> DebtContractVersion | None:
        if contract.current_version_id is None:
            return None
        return await self._version_dao.get_by_id(contract.current_version_id)

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
