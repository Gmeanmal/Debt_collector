from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from controllers._goddess import resolve_goddess_id
from core.config import get_settings
from core.exceptions import BadRequest, Conflict, Forbidden, NotFound
from daos.blacklist_dao import BlacklistDao
from daos.debt_dao import DebtContractAuditDao, DebtContractDao
from daos.token_dao import TokenDao
from daos.user_dao import UserDao
from models.blacklist import BlacklistEntry
from models.debt import DebtContract, DebtContractAudit, DebtContractEventType, DebtContractStatus
from models.notification import NotificationType
from models.user import User, UserStatus
from schemas.blacklist import BlacklistEntryOut
from services.notifications.notify import notify


def _now_utc() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _entry_out(entry: BlacklistEntry) -> BlacklistEntryOut:
    return BlacklistEntryOut(
        id=entry.id,
        goddess_id=entry.goddess_id,
        sub_id=entry.sub_id,
        reason=entry.reason,
        balance_snapshot=Decimal(str(entry.balance_snapshot)),
        reinstatement_fee_paid=(
            Decimal(str(entry.reinstatement_fee_paid))
            if entry.reinstatement_fee_paid is not None
            else None
        ),
        breached_at=entry.breached_at,
        forgiven_at=entry.forgiven_at,
        created_at=entry.created_at,
    )


class BlacklistController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = BlacklistDao(session)
        self._contract_dao = DebtContractDao(session)
        self._audit_dao = DebtContractAuditDao(session)
        self._user_dao = UserDao(session)
        settings = get_settings()
        self._token_dao = TokenDao(
            session,
            refresh_ttl_days=settings.jwt_refresh_ttl_days,
            reset_ttl_minutes=settings.password_reset_ttl_minutes,
        )

    async def breach(
        self, goddess_user: User, sub_id: UUID, reason: str | None
    ) -> BlacklistEntryOut:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        sub = await self._user_dao.get_by_id(sub_id)
        if sub is None or sub.goddess_id != goddess_id:
            raise NotFound("sub not found or not linked to this goddess")
        if sub.status == UserStatus.blacklisted:
            raise Conflict("sub is already blacklisted")

        now = _now_utc()
        result = await self._session.execute(
            select(DebtContract).where(
                col(DebtContract.sub_id) == sub_id,
                col(DebtContract.status) == DebtContractStatus.active,
            )
        )
        active_contracts = list(result.scalars().all())

        snapshot = Decimal("0.00")
        for contract in active_contracts:
            snapshot += Decimal(str(contract.balance))
            from_status = contract.status
            contract.status = DebtContractStatus.breached
            contract.updated_at = now
            self._session.add(contract)
            await self._session.flush()
            await self._audit_dao.append(
                DebtContractAudit(
                    contract_id=contract.id,
                    event_type=DebtContractEventType.breached,
                    actor_id=goddess_user.id,
                    from_status=from_status,
                    to_status=DebtContractStatus.breached,
                    note=reason,
                )
            )

        sub.status = UserStatus.blacklisted
        self._session.add(sub)
        await self._session.flush()

        await self._token_dao.revoke_all_refresh_for_user(sub_id)

        entry = await self._dao.add(
            BlacklistEntry(
                goddess_id=goddess_id,
                sub_id=sub_id,
                reason=reason,
                balance_snapshot=snapshot,
                breached_at=now,
            )
        )

        await notify(
            self._session,
            sub_id,
            NotificationType.contract_breached,
            title="Contract breached",
            body=reason or "Your contract has been breached and you are now blacklisted.",
            link="/sub",
            payload={"entry_id": str(entry.id)},
        )

        return _entry_out(entry)

    async def list(self, goddess_user: User) -> list[BlacklistEntryOut]:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        entries = await self._dao.list_for_goddess(goddess_id)
        return [_entry_out(e) for e in entries]

    async def forgive(
        self, goddess_user: User, entry_id: UUID, reinstatement_fee_paid: Decimal
    ) -> BlacklistEntryOut:
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        entry = await self._dao.get_by_id(entry_id)
        if entry is None:
            raise NotFound("blacklist entry not found")
        if entry.goddess_id != goddess_id:
            raise Forbidden("entry does not belong to this goddess")
        if entry.forgiven_at is not None:
            raise Conflict("entry is already forgiven")
        if reinstatement_fee_paid < 0:
            raise BadRequest("reinstatement fee must be non-negative")

        now = _now_utc()
        entry = await self._dao.forgive(entry, reinstatement_fee_paid, now)

        sub = await self._user_dao.get_by_id(entry.sub_id)
        if sub is not None:
            sub.status = UserStatus.active
            self._session.add(sub)
            await self._session.flush()

        await notify(
            self._session,
            entry.sub_id,
            NotificationType.contract_forgiven,
            title="Breach forgiven",
            body="Your goddess has forgiven the breach. Your account is reinstated.",
            link="/sub",
            payload={"entry_id": str(entry.id)},
        )

        return _entry_out(entry)
