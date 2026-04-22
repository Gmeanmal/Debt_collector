"""Seed realistic dev data: 6 subs from the frozen cast.

Idempotent — checks for `sub_chris` and skips if already present. All dates anchor
to FROZEN_TODAY; no datetime.now() calls. Per-sub builders live under
`seeds.profiles`; shared helpers under `seeds._common`.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from core.db import SessionMaker
from models.adjustment import ContractAdjustment
from models.admin_action import AdminAction
from models.blacklist import BlacklistEntry
from models.debt import DebtContract, DebtContractStatus
from models.invitation import Invitation
from models.payment import DeclarationSource, PaymentDeclaration, PaymentStatus
from models.payment_method import PaymentMethod
from models.ritual import Ritual
from models.rolling import RollingTribute
from models.sub_limit import SubLimit
from seeds._common import (
    existing_cast,
    get_goddess,
    kink_items,
    payment_methods,
    set_goddess_user_id,
)
from seeds.profiles import (
    seed_ben,
    seed_chris,
    seed_dan,
    seed_eli,
    seed_invite_alex,
    seed_invite_jordan,
)

log = structlog.get_logger()


def _admin_action(
    *,
    admin_id: UUID,
    kind: str,
    entity: str,
    entity_id: UUID | None,
    payload: dict[str, object] | None,
    created_at: datetime,
) -> AdminAction:
    return AdminAction(
        admin_id=admin_id,
        action=kind,
        entity=entity,
        entity_id=entity_id,
        payload_json=payload,
        created_at=created_at,
    )


async def _seed_admin_actions(session: AsyncSession, goddess_user_id: UUID) -> int:
    """Backfill audit-log entries for seeded fake data.

    Called after all profile builders have run and flushed their rows. Emits one
    `admin_action` per goddess mutation we fake so the admin audit screen shows a
    realistic timeline without needing a real-user click path.
    """
    rows: list[AdminAction] = []

    invitations = (await session.execute(select(Invitation))).scalars().all()
    for inv in invitations:
        rows.append(
            _admin_action(
                admin_id=goddess_user_id,
                kind="invitation_created",
                entity="invitation",
                entity_id=inv.id,
                payload={"note": inv.note, "entry_tribute_amount": str(inv.entry_tribute_amount)},
                created_at=inv.created_at,
            )
        )

    validated_payments = (
        (
            await session.execute(
                select(PaymentDeclaration).where(
                    PaymentDeclaration.status == PaymentStatus.validated
                )
            )
        )
        .scalars()
        .all()
    )
    for pay in validated_payments:
        if pay.source == DeclarationSource.goddess_recorded:
            kind = "payment_recorded"
        else:
            kind = "payment_validated"
        stamp = pay.validated_at or pay.declared_at
        rows.append(
            _admin_action(
                admin_id=goddess_user_id,
                kind=kind,
                entity="payment_declaration",
                entity_id=pay.id,
                payload={"amount": str(pay.amount), "category": pay.category.value},
                created_at=stamp,
            )
        )

    rejected_payments = (
        (
            await session.execute(
                select(PaymentDeclaration).where(
                    PaymentDeclaration.status == PaymentStatus.rejected
                )
            )
        )
        .scalars()
        .all()
    )
    for pay in rejected_payments:
        stamp = pay.validated_at or pay.declared_at
        rows.append(
            _admin_action(
                admin_id=goddess_user_id,
                kind="payment_rejected",
                entity="payment_declaration",
                entity_id=pay.id,
                payload={"amount": str(pay.amount), "reason": pay.rejection_reason},
                created_at=stamp,
            )
        )

    contracts = (await session.execute(select(DebtContract))).scalars().all()
    for contract in contracts:
        rows.append(
            _admin_action(
                admin_id=goddess_user_id,
                kind="contract_created",
                entity="debt_contract",
                entity_id=contract.id,
                payload={
                    "principal": str(contract.principal),
                    "duration_periods": contract.duration_periods,
                    "status": contract.status.value,
                },
                created_at=contract.created_at,
            )
        )
        if contract.status == DebtContractStatus.closed:
            rows.append(
                _admin_action(
                    admin_id=goddess_user_id,
                    kind="contract_closed",
                    entity="debt_contract",
                    entity_id=contract.id,
                    payload={"balance": str(contract.balance)},
                    created_at=contract.updated_at,
                )
            )

    blacklist = (await session.execute(select(BlacklistEntry))).scalars().all()
    for entry in blacklist:
        rows.append(
            _admin_action(
                admin_id=goddess_user_id,
                kind="breach_applied",
                entity="blacklist_entry",
                entity_id=entry.id,
                payload={
                    "reason": entry.reason,
                    "balance_snapshot": str(entry.balance_snapshot),
                },
                created_at=entry.breached_at,
            )
        )

    adjustments = (await session.execute(select(ContractAdjustment))).scalars().all()
    for adj in adjustments:
        rows.append(
            _admin_action(
                admin_id=goddess_user_id,
                kind="adjustment_created",
                entity="contract_adjustment",
                entity_id=adj.id,
                payload={"amount": str(adj.amount), "reason": adj.reason},
                created_at=adj.created_at,
            )
        )

    rollings = (await session.execute(select(RollingTribute))).scalars().all()
    for roll in rollings:
        rows.append(
            _admin_action(
                admin_id=goddess_user_id,
                kind="rolling_upserted",
                entity="rolling_tribute",
                entity_id=roll.id,
                payload={
                    "amount": str(roll.amount),
                    "deadline_day": roll.deadline_day.value,
                },
                created_at=roll.created_at,
            )
        )

    rituals = (await session.execute(select(Ritual))).scalars().all()
    for ritual in rituals:
        rows.append(
            _admin_action(
                admin_id=goddess_user_id,
                kind="ritual_created",
                entity="ritual",
                entity_id=ritual.id,
                payload={"title": ritual.title, "frequency": ritual.frequency.value},
                created_at=ritual.created_at,
            )
        )

    acknowledged_limits = (
        (
            await session.execute(
                select(SubLimit).where(SubLimit.acknowledged_by_goddess_at.is_not(None))  # type: ignore[union-attr]
            )
        )
        .scalars()
        .all()
    )
    for lim in acknowledged_limits:
        stamp = lim.acknowledged_by_goddess_at or lim.created_at
        rows.append(
            _admin_action(
                admin_id=goddess_user_id,
                kind="limit_acknowledged",
                entity="sub_limit",
                entity_id=lim.id,
                payload={"kind": lim.kind.value, "severity": lim.severity.value},
                created_at=stamp,
            )
        )

    for pm in (await session.execute(select(PaymentMethod))).scalars().all():
        rows.append(
            _admin_action(
                admin_id=goddess_user_id,
                kind="payment_method_created",
                entity="payment_method",
                entity_id=pm.id,
                payload={"type": pm.type.value, "name": pm.name},
                created_at=pm.created_at,
            )
        )

    for row in rows:
        session.add(row)
    await session.flush()
    return len(rows)


async def seed_fake_data() -> None:
    async with SessionMaker() as session:
        if await existing_cast(session):
            print("seed_fake_data: cast already present — skipping")
            return

        goddess, goddess_user = await get_goddess(session)
        set_goddess_user_id(goddess_user.id)

        methods = payment_methods(goddess.id)
        for m in methods:
            session.add(m)
        await session.flush()

        kinks = await kink_items(session)

        await seed_chris(session, goddess.id, goddess_user.id, methods, kinks)
        await session.flush()
        await seed_dan(session, goddess.id, goddess_user.id, methods, kinks)
        await session.flush()
        await seed_ben(session, goddess.id, goddess_user.id, methods, kinks)
        await session.flush()
        await seed_invite_alex(session, goddess.id, methods)
        await session.flush()
        await seed_invite_jordan(session, goddess.id)
        await session.flush()
        await seed_eli(session, goddess.id, goddess_user.id, methods, kinks)
        await session.flush()

        audit_rows = await _seed_admin_actions(session, goddess_user.id)

        await session.commit()

    print(f"seed_fake_data: 6-sub cast + payment methods seeded; admin_action rows: {audit_rows}.")
