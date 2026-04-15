"""Realistic fake data seed: 11 subs covering every state Mean Mal will see in production.

Idempotent — checks for `sub_alex` and skips if already present.
"""

from __future__ import annotations

import datetime as dt
from datetime import UTC, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.db import SessionMaker
from core.security import hash_password
from models.adjustment import AdjustmentStatus, ContractAdjustment
from models.blacklist import BlacklistEntry
from models.debt import (
    DebtContract,
    DebtContractAudit,
    DebtContractEventType,
    DebtContractStatus,
    DebtContractVersion,
    InterestPeriod,
    LatePenaltySeverity,
    MidContractAdditionMode,
    PaymentFrequency,
)
from models.debt_event import DebtEvent, EventType
from models.invitation import Invitation
from models.notification import Notification, NotificationType
from models.payment import (
    AllocationTargetType,
    PaymentAllocation,
    PaymentCategory,
    PaymentDeclaration,
    PaymentStatus,
)
from models.payment_method import PaymentMethod, PaymentMethodType
from models.rolling import DeadlineDay, RollingTribute
from models.user import AvatarKey, Goddess, User, UserRole, UserStatus
from utils.ledger import replay_events

log = structlog.get_logger()

SUB_PASSWORD = "ChangeMe!Dev123"


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _ago(**kw: int) -> datetime:
    return _now() - timedelta(**kw)


def _ahead(**kw: int) -> datetime:
    return _now() + timedelta(**kw)


_goddess_user_id: UUID | None = None


def _gud() -> UUID:
    assert _goddess_user_id is not None, "goddess user id not initialised"
    return _goddess_user_id


async def _existing(session: AsyncSession) -> bool:
    result = await session.execute(select(User).where(col(User.username) == "sub_alex"))
    return result.scalar_one_or_none() is not None


async def _get_goddess(session: AsyncSession) -> tuple[Goddess, User]:
    g_result = await session.execute(select(Goddess))
    goddess = g_result.scalars().first()
    if goddess is None:
        raise RuntimeError("Bootstrap goddess missing — run bootstrap before fake_data")
    u_result = await session.execute(
        select(User).where(col(User.email) == goddess.email, col(User.role) == UserRole.goddess)
    )
    user = u_result.scalar_one()
    return goddess, user


_AVATAR_CYCLE = list(AvatarKey)


def _make_sub(
    goddess_id: UUID,
    username: str,
    first: str,
    last: str,
    status: UserStatus = UserStatus.active,
    *,
    twitter: str | None = None,
    note: str | None = None,
    days_old: int = 60,
    avatar_key: AvatarKey | None = None,
    payment_handle: str | None = None,
) -> User:
    return User(
        id=uuid4(),
        goddess_id=goddess_id,
        username=username,
        email=f"{username}@subs.local",
        password_hash=hash_password(SUB_PASSWORD),
        role=UserRole.sub,
        status=status,
        first_name=first,
        last_name=last,
        twitter_handle=twitter,
        source_note=note,
        theme_preference="dark",
        avatar_key=avatar_key or AvatarKey.default,
        payment_handle=payment_handle,
        created_at=_ago(days=days_old),
    )


def _payment_methods(goddess_id: UUID) -> list[PaymentMethod]:
    base = _ago(days=120)
    return [
        PaymentMethod(
            id=uuid4(),
            goddess_id=goddess_id,
            name="Throne wishlist",
            type=PaymentMethodType.throne,
            handle_or_link="https://throne.com/meanmal",
            note="Public wishlist; preferred channel.",
            enabled=True,
            sort_order=0,
            created_at=base,
            updated_at=base,
        ),
        PaymentMethod(
            id=uuid4(),
            goddess_id=goddess_id,
            name="PayPal (friends)",
            type=PaymentMethodType.paypal,
            handle_or_link="meanmal@paypal.local",
            note="Send as friends/family only.",
            enabled=True,
            sort_order=1,
            created_at=base,
            updated_at=base,
        ),
        PaymentMethod(
            id=uuid4(),
            goddess_id=goddess_id,
            name="Bank transfer (GBP)",
            type=PaymentMethodType.bank,
            handle_or_link="GB29 NWBK 6016 1331 9268 19",
            note="Reference must include sub username.",
            enabled=True,
            sort_order=2,
            created_at=base,
            updated_at=base,
        ),
        PaymentMethod(
            id=uuid4(),
            goddess_id=goddess_id,
            name="Crypto (BTC)",
            type=PaymentMethodType.other,
            handle_or_link="bc1qmeanmaldevaddrxxxxxxxxxxxxxxxxxxxxxxxx",
            note="Disabled — restoring soon.",
            enabled=False,
            sort_order=3,
            created_at=base,
            updated_at=base,
        ),
    ]


def _rolling(
    sub_id: UUID,
    goddess_id: UUID,
    *,
    amount: Decimal,
    day: DeadlineDay = DeadlineDay.fri,
    deadline: time = time(20, 0),
    last_paid_days_ago: int | None = 5,
    paused: bool = False,
    notes: str | None = None,
) -> RollingTribute:
    return RollingTribute(
        id=uuid4(),
        sub_id=sub_id,
        goddess_id=goddess_id,
        amount=float(amount),
        deadline_day=day,
        deadline_time=deadline,
        late_multiplier_per_day=1,
        paused=paused,
        notes=notes,
        last_paid_at=(_ago(days=last_paid_days_ago) if last_paid_days_ago is not None else None),
        created_at=_ago(days=45),
        updated_at=_ago(days=last_paid_days_ago or 45),
    )


async def _add_validated(
    s: AsyncSession,
    *,
    sub: User,
    goddess_id: UUID,
    method_id: UUID,
    amount: Decimal,
    category: PaymentCategory,
    target_type: AllocationTargetType,
    target_id: UUID | None,
    days_ago: int,
    note: str | None = None,
) -> None:
    declared = _ago(days=days_ago)
    validated = declared + timedelta(hours=4)
    decl = PaymentDeclaration(
        id=uuid4(),
        sub_id=sub.id,
        goddess_id=goddess_id,
        method_id=method_id,
        amount=float(amount),
        external_timestamp=declared,
        note=note,
        category=category,
        status=PaymentStatus.validated,
        target_id=target_id,
        created_by=sub.id,
        declared_at=declared,
        validated_at=validated,
        validated_by=_gud(),
    )
    alloc = PaymentAllocation(
        id=uuid4(),
        declaration_id=decl.id,
        target_type=target_type,
        target_id=target_id,
        amount=float(amount),
        allocated_at=validated,
    )
    s.add(decl)
    await s.flush()
    s.add(alloc)


def _pending_declaration(
    *,
    sub: User,
    goddess_id: UUID,
    method_id: UUID,
    amount: Decimal,
    category: PaymentCategory,
    target_id: UUID | None,
    days_ago: int,
    note: str | None = None,
) -> PaymentDeclaration:
    return PaymentDeclaration(
        id=uuid4(),
        sub_id=sub.id,
        goddess_id=goddess_id,
        method_id=method_id,
        amount=float(amount),
        external_timestamp=_ago(days=days_ago),
        note=note,
        category=category,
        status=PaymentStatus.pending,
        target_id=target_id,
        created_by=sub.id,
        declared_at=_ago(days=days_ago),
        validated_by=None,
    )


def _contract(
    *,
    sub_id: UUID,
    goddess_id: UUID,
    principal: Decimal,
    monthly_rate: Decimal,
    duration_periods: int,
    minimum_payment: Decimal,
    frequency: PaymentFrequency,
    severity: LatePenaltySeverity = LatePenaltySeverity.medium,
    late_pct: Decimal = Decimal("0.05"),
    addition_mode: MidContractAdditionMode = MidContractAdditionMode.sub_approval_required,
    exit_amount: Decimal | None = None,
    status: DebtContractStatus,
    sub_initiated: bool = False,
    days_old: int = 30,
    signed_days_ago: int | None = None,
) -> DebtContract:
    exit_amt = exit_amount if exit_amount is not None else principal * Decimal("1.25")
    created = _ago(days=days_old)
    signed_at = _ago(days=signed_days_ago) if signed_days_ago is not None else None
    return DebtContract(
        id=uuid4(),
        sub_id=sub_id,
        goddess_id=goddess_id,
        sub_initiated=sub_initiated,
        principal=principal,
        interest_rate=monthly_rate,
        interest_period=InterestPeriod.monthly,
        duration_periods=duration_periods,
        payment_frequency=frequency,
        minimum_payment=minimum_payment,
        late_penalty_severity=severity,
        late_penalty_percent=late_pct,
        dom_can_add_surprise_penalty=True,
        mid_contract_addition_mode=addition_mode,
        exit_amount=exit_amt,
        status=status,
        balance=principal,
        created_at=created,
        updated_at=created,
        signed_at=signed_at,
        signed_pdf_url=(f"contracts/dev/{uuid4()}.pdf" if signed_at else None),
        signed_pdf_sha256=("0" * 64) if signed_at else None,
    )


def _version_from_contract(
    contract: DebtContract, proposed_by: UUID, round_no: int
) -> DebtContractVersion:
    return DebtContractVersion(
        id=uuid4(),
        contract_id=contract.id,
        round_no=round_no,
        proposed_by=proposed_by,
        proposed_at=contract.created_at,
        principal=contract.principal,
        interest_rate=contract.interest_rate,
        interest_period=contract.interest_period,
        duration_periods=contract.duration_periods,
        payment_frequency=contract.payment_frequency,
        minimum_payment=contract.minimum_payment,
        late_penalty_severity=contract.late_penalty_severity,
        late_penalty_percent=contract.late_penalty_percent,
        dom_can_add_surprise_penalty=contract.dom_can_add_surprise_penalty,
        mid_contract_addition_mode=contract.mid_contract_addition_mode,
        exit_amount=contract.exit_amount,
    )


def _audit(
    contract_id: UUID,
    actor_id: UUID,
    event_type: DebtContractEventType,
    *,
    from_status: DebtContractStatus | None = None,
    to_status: DebtContractStatus | None = None,
    note: str | None = None,
    when: datetime | None = None,
) -> DebtContractAudit:
    return DebtContractAudit(
        id=uuid4(),
        contract_id=contract_id,
        event_type=event_type,
        actor_id=actor_id,
        from_status=from_status,
        to_status=to_status,
        note=note,
        created_at=when or _now(),
    )


def _notif(
    user_id: UUID,
    type_: NotificationType,
    title: str,
    body: str,
    link: str | None = None,
    *,
    days_ago: int = 1,
    read: bool = False,
) -> Notification:
    created = _ago(days=days_ago)
    return Notification(
        id=uuid4(),
        user_id=user_id,
        type=type_,
        title=title,
        body=body,
        link=link,
        payload=None,
        read_at=(created + timedelta(hours=2)) if read else None,
        created_at=created,
    )


# ---------------------------------------------------------------------------
# Per-sub builders
# ---------------------------------------------------------------------------


async def _seed_alex(s: AsyncSession, goddess_id: UUID, throne_id: UUID) -> User:
    """Happy path: rolling paid on time, no debt, several validated tributes."""
    sub = _make_sub(
        goddess_id,
        "sub_alex",
        "Alex",
        "Bishop",
        twitter="@alexbishop",
        note="Recruited via Twitter DM in February.",
        avatar_key=AvatarKey.pink_1,
        payment_handle="alexbishop",
    )
    s.add(sub)
    await s.flush()
    rolling = _rolling(sub.id, goddess_id, amount=Decimal("120.00"), last_paid_days_ago=2)
    s.add(rolling)
    for weeks in (10, 8, 6, 4, 2):
        await _add_validated(
            s,
            sub=sub,
            goddess_id=goddess_id,
            method_id=throne_id,
            amount=Decimal("120.00"),
            category=PaymentCategory.rolling,
            target_type=AllocationTargetType.rolling_cycle,
            target_id=rolling.id,
            days_ago=weeks * 7,
        )
    await _add_validated(
        s,
        sub=sub,
        goddess_id=goddess_id,
        method_id=throne_id,
        amount=Decimal("250.00"),
        category=PaymentCategory.tribute,
        target_type=AllocationTargetType.tribute,
        target_id=None,
        days_ago=14,
        note="Birthday tribute.",
    )
    return sub


async def _seed_ben(s: AsyncSession, goddess_id: UUID, paypal_id: UUID) -> User:
    """Rolling 6 days late, has paid before, no debt."""
    sub = _make_sub(
        goddess_id,
        "sub_ben",
        "Ben",
        "Carter",
        twitter="@bencarter88",
        avatar_key=AvatarKey.pink_2,
        payment_handle="bencarter88",
    )
    s.add(sub)
    await s.flush()
    rolling = _rolling(
        sub.id,
        goddess_id,
        amount=Decimal("80.00"),
        last_paid_days_ago=14,
        notes="Reminded twice; expect payment this weekend.",
    )
    s.add(rolling)
    for weeks in (8, 6, 4):
        await _add_validated(
            s,
            sub=sub,
            goddess_id=goddess_id,
            method_id=paypal_id,
            amount=Decimal("80.00"),
            category=PaymentCategory.rolling,
            target_type=AllocationTargetType.rolling_cycle,
            target_id=rolling.id,
            days_ago=weeks * 7,
        )
    s.add(
        _notif(
            sub.id,
            NotificationType.rolling_late,
            "Rolling tribute overdue",
            "Your weekly rolling tribute of £80 is 6 days late.",
            "/sub/payments/new",
            days_ago=2,
        )
    )
    return sub


async def _seed_chris(
    s: AsyncSession, goddess_id: UUID, goddess_user_id: UUID, throne_id: UUID
) -> User:
    """Active rolling + active debt contract repaying nicely; one pending adjustment."""
    sub = _make_sub(goddess_id, "sub_chris", "Chris", "Doyle", avatar_key=AvatarKey.dark_1)
    s.add(sub)
    await s.flush()
    rolling = _rolling(sub.id, goddess_id, amount=Decimal("60.00"), last_paid_days_ago=3)
    s.add(rolling)

    contract = _contract(
        sub_id=sub.id,
        goddess_id=goddess_id,
        principal=Decimal("1000.00"),
        monthly_rate=Decimal("0.050000"),
        duration_periods=12,
        minimum_payment=Decimal("100.00"),
        frequency=PaymentFrequency.weekly,
        status=DebtContractStatus.active,
        days_old=45,
        signed_days_ago=42,
    )
    s.add(contract)
    version = _version_from_contract(contract, goddess_user_id, round_no=0)
    s.add(version)
    await s.flush()
    contract.current_version_id = version.id

    s.add_all(
        [
            _audit(
                contract.id,
                goddess_user_id,
                DebtContractEventType.proposed,
                to_status=DebtContractStatus.pending_sub,
                when=contract.created_at,
            ),
            _audit(
                contract.id,
                sub.id,
                DebtContractEventType.signed,
                from_status=DebtContractStatus.pending_sub,
                to_status=DebtContractStatus.active,
                when=contract.signed_at or contract.created_at,
            ),
        ]
    )

    events: list[DebtEvent] = []
    weekly_rate = Decimal("0.050000") * Decimal("12") / Decimal("52")
    for i in range(1, 5):
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=contract.id,
                event_type=EventType.period_interest,
                amount=weekly_rate.quantize(Decimal("0.0001")),
                period_index=i,
                created_at=_ago(days=42 - i * 7),
                note=f"Weekly interest tick #{i}",
            )
        )
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=contract.id,
                event_type=EventType.payment_applied,
                amount=Decimal("100.0000"),
                period_index=i,
                created_at=_ago(days=42 - i * 7) + timedelta(hours=12),
                note="Weekly minimum payment",
            )
        )
    for ev in events:
        s.add(ev)
        if ev.event_type == EventType.payment_applied:
            await _add_validated(
                s,
                sub=sub,
                goddess_id=goddess_id,
                method_id=throne_id,
                amount=Decimal("100.00"),
                category=PaymentCategory.weekly_debt,
                target_type=AllocationTargetType.contract_debt,
                target_id=contract.id,
                days_ago=42 - (ev.period_index or 0) * 7,
            )
    contract.balance = replay_events(contract.principal, events)

    s.add(
        ContractAdjustment(
            id=uuid4(),
            contract_id=contract.id,
            proposed_by=goddess_user_id,
            amount=Decimal("75.00"),
            reason="Late slack from week 3 — formalising it.",
            status=AdjustmentStatus.pending_sub_approval,
            created_at=_ago(days=2),
            updated_at=_ago(days=2),
        )
    )
    return sub


async def _seed_dan(s: AsyncSession, goddess_id: UUID, goddess_user_id: UUID) -> User:
    """Active debt contract LATE: missed last 2 weekly payments, late penalties accrued."""
    sub = _make_sub(
        goddess_id, "sub_dan", "Dan", "Ellis", twitter="@dellis", avatar_key=AvatarKey.dark_2
    )
    s.add(sub)
    await s.flush()

    contract = _contract(
        sub_id=sub.id,
        goddess_id=goddess_id,
        principal=Decimal("750.00"),
        monthly_rate=Decimal("0.080000"),
        duration_periods=10,
        minimum_payment=Decimal("90.00"),
        frequency=PaymentFrequency.weekly,
        severity=LatePenaltySeverity.severe,
        late_pct=Decimal("0.10"),
        status=DebtContractStatus.active,
        days_old=35,
        signed_days_ago=33,
    )
    s.add(contract)
    version = _version_from_contract(contract, goddess_user_id, round_no=0)
    s.add(version)
    await s.flush()
    contract.current_version_id = version.id

    s.add_all(
        [
            _audit(
                contract.id,
                goddess_user_id,
                DebtContractEventType.proposed,
                to_status=DebtContractStatus.pending_sub,
                when=contract.created_at,
            ),
            _audit(
                contract.id,
                sub.id,
                DebtContractEventType.signed,
                from_status=DebtContractStatus.pending_sub,
                to_status=DebtContractStatus.active,
                when=contract.signed_at or contract.created_at,
            ),
        ]
    )

    weekly_rate = Decimal("0.080000") * Decimal("12") / Decimal("52")
    events: list[DebtEvent] = []
    for i in range(1, 5):
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=contract.id,
                event_type=EventType.period_interest,
                amount=weekly_rate.quantize(Decimal("0.0001")),
                period_index=i,
                created_at=_ago(days=33 - i * 7),
            )
        )
    for i in (4, 5):
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=contract.id,
                event_type=EventType.late_penalty,
                amount=Decimal("0.1000"),
                period_index=i,
                created_at=_ago(days=33 - i * 7) + timedelta(hours=2),
                note="Missed weekly payment",
            )
        )
    for ev in events:
        s.add(ev)
    contract.balance = replay_events(contract.principal, events)

    s.add(
        _notif(
            sub.id,
            NotificationType.contract_late_penalty,
            "Late penalty applied",
            "10% late penalty applied for missing your weekly debt payment.",
            f"/sub/debts/{contract.id}",
            days_ago=1,
        )
    )
    return sub


async def _seed_eli(
    s: AsyncSession, goddess_id: UUID, goddess_user_id: UUID, paypal_id: UUID
) -> tuple[User, Invitation]:
    """Just signed up via invitation; pending entry tribute declaration."""
    sub = _make_sub(
        goddess_id,
        "sub_eli",
        "Eli",
        "Foster",
        status=UserStatus.pending_entry_tribute,
        days_old=2,
        note="Twitter recruitment, claimed invitation 2 days ago.",
        avatar_key=AvatarKey.accent_1,
    )
    s.add(sub)
    await s.flush()
    invitation = Invitation(
        id=uuid4(),
        token="inv-used-eli-" + uuid4().hex[:8],
        goddess_id=goddess_id,
        entry_tribute_amount=Decimal("150.00"),
        note="Twitter follower → Eli",
        expires_at=_ahead(days=5),
        used_at=_ago(days=2),
        used_by_user_id=sub.id,
        created_at=_ago(days=7),
    )
    s.add(invitation)
    s.add(
        _pending_declaration(
            sub=sub,
            goddess_id=goddess_id,
            method_id=paypal_id,
            amount=Decimal("150.00"),
            category=PaymentCategory.entry,
            target_id=None,
            days_ago=1,
            note="Entry tribute declared, awaiting validation.",
        )
    )
    s.add(
        _notif(
            goddess_user_id,
            NotificationType.invitation_claimed,
            "Invitation claimed",
            f"{sub.username} signed up via your invitation.",
            "/goddess/validations",
            days_ago=2,
            read=False,
        )
    )
    return sub, invitation


async def _seed_fred(s: AsyncSession, goddess_id: UUID, goddess_user_id: UUID) -> User:
    """Contract pending_sub_signature — counter accepted by goddess, awaiting sign."""
    sub = _make_sub(goddess_id, "sub_fred", "Fred", "Greene", avatar_key=AvatarKey.accent_2)
    s.add(sub)
    await s.flush()
    contract = _contract(
        sub_id=sub.id,
        goddess_id=goddess_id,
        principal=Decimal("500.00"),
        monthly_rate=Decimal("0.040000"),
        duration_periods=8,
        minimum_payment=Decimal("70.00"),
        frequency=PaymentFrequency.weekly,
        status=DebtContractStatus.pending_sub_signature,
        days_old=4,
    )
    s.add(contract)
    v0 = _version_from_contract(contract, goddess_user_id, round_no=0)
    v1 = _version_from_contract(contract, sub.id, round_no=1)
    s.add_all([v0, v1])
    contract.current_version_id = v1.id
    s.add_all(
        [
            _audit(
                contract.id,
                goddess_user_id,
                DebtContractEventType.proposed,
                to_status=DebtContractStatus.pending_sub,
                when=_ago(days=4),
            ),
            _audit(
                contract.id,
                sub.id,
                DebtContractEventType.countered,
                from_status=DebtContractStatus.pending_sub,
                to_status=DebtContractStatus.pending_dom_counter,
                when=_ago(days=3),
            ),
            _audit(
                contract.id,
                goddess_user_id,
                DebtContractEventType.accepted_counter,
                from_status=DebtContractStatus.pending_dom_counter,
                to_status=DebtContractStatus.pending_sub_signature,
                when=_ago(days=1),
            ),
        ]
    )
    return sub


async def _seed_gary(s: AsyncSession, goddess_id: UUID, goddess_user_id: UUID) -> User:
    """Sub-initiated contract still pending_dom — awaiting goddess decision."""
    sub = _make_sub(goddess_id, "sub_gary", "Gary", "Hill", avatar_key=AvatarKey.pink_3)
    s.add(sub)
    await s.flush()
    contract = _contract(
        sub_id=sub.id,
        goddess_id=goddess_id,
        principal=Decimal("300.00"),
        monthly_rate=Decimal("0.030000"),
        duration_periods=6,
        minimum_payment=Decimal("60.00"),
        frequency=PaymentFrequency.weekly,
        status=DebtContractStatus.pending_dom,
        sub_initiated=True,
        days_old=2,
    )
    s.add(contract)
    version = _version_from_contract(contract, sub.id, round_no=0)
    s.add(version)
    await s.flush()
    contract.current_version_id = version.id
    s.add(
        _audit(
            contract.id,
            sub.id,
            DebtContractEventType.proposed,
            to_status=DebtContractStatus.pending_dom,
            when=_ago(days=2),
        )
    )
    s.add(
        _notif(
            goddess_user_id,
            NotificationType.contract_proposed,
            "New contract proposal",
            f"{sub.username} proposed a £300 debt contract.",
            "/goddess/debts",
            days_ago=2,
        )
    )
    return sub


async def _seed_henry(s: AsyncSession, goddess_id: UUID, goddess_user_id: UUID) -> User:
    """Sub countered the goddess's proposal; pending_dom_counter."""
    sub = _make_sub(goddess_id, "sub_henry", "Henry", "Irving", avatar_key=AvatarKey.pink_4)
    s.add(sub)
    await s.flush()
    contract = _contract(
        sub_id=sub.id,
        goddess_id=goddess_id,
        principal=Decimal("600.00"),
        monthly_rate=Decimal("0.060000"),
        duration_periods=12,
        minimum_payment=Decimal("65.00"),
        frequency=PaymentFrequency.weekly,
        status=DebtContractStatus.pending_dom_counter,
        days_old=3,
    )
    s.add(contract)
    v0 = _version_from_contract(contract, goddess_user_id, round_no=0)
    v1 = _version_from_contract(contract, sub.id, round_no=1)
    s.add_all([v0, v1])
    contract.current_version_id = v1.id
    s.add_all(
        [
            _audit(
                contract.id,
                goddess_user_id,
                DebtContractEventType.proposed,
                to_status=DebtContractStatus.pending_sub,
                when=_ago(days=3),
            ),
            _audit(
                contract.id,
                sub.id,
                DebtContractEventType.countered,
                from_status=DebtContractStatus.pending_sub,
                to_status=DebtContractStatus.pending_dom_counter,
                when=_ago(days=1),
            ),
        ]
    )
    s.add(
        _notif(
            goddess_user_id,
            NotificationType.contract_countered,
            "Counter-proposal received",
            f"{sub.username} countered with reduced minimum payment.",
            "/goddess/debts",
            days_ago=1,
        )
    )
    return sub


async def _seed_ian(
    s: AsyncSession, goddess_id: UUID, goddess_user_id: UUID, bank_id: UUID
) -> User:
    """Contract paid in full via buyout → completed; large total drained."""
    sub = _make_sub(
        goddess_id,
        "sub_ian",
        "Ian",
        "Jones",
        twitter="@ianjones",
        avatar_key=AvatarKey.dark_3,
        payment_handle="ianjones",
    )
    s.add(sub)
    await s.flush()
    rolling = _rolling(sub.id, goddess_id, amount=Decimal("200.00"), last_paid_days_ago=4)
    s.add(rolling)

    contract = _contract(
        sub_id=sub.id,
        goddess_id=goddess_id,
        principal=Decimal("2000.00"),
        monthly_rate=Decimal("0.045000"),
        duration_periods=12,
        minimum_payment=Decimal("180.00"),
        frequency=PaymentFrequency.monthly,
        status=DebtContractStatus.completed,
        days_old=200,
        signed_days_ago=190,
        exit_amount=Decimal("2200.00"),
    )
    s.add(contract)
    version = _version_from_contract(contract, goddess_user_id, round_no=0)
    s.add(version)
    await s.flush()
    contract.current_version_id = version.id

    s.add_all(
        [
            _audit(
                contract.id,
                goddess_user_id,
                DebtContractEventType.proposed,
                to_status=DebtContractStatus.pending_sub,
                when=contract.created_at,
            ),
            _audit(
                contract.id,
                sub.id,
                DebtContractEventType.signed,
                from_status=DebtContractStatus.pending_sub,
                to_status=DebtContractStatus.active,
                when=contract.signed_at or contract.created_at,
            ),
            _audit(
                contract.id,
                sub.id,
                DebtContractEventType.completed,
                from_status=DebtContractStatus.active,
                to_status=DebtContractStatus.completed,
                note="Buyout paid",
                when=_ago(days=15),
            ),
        ]
    )

    monthly_rate = Decimal("0.045000")
    events: list[DebtEvent] = []
    for i in range(1, 6):
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=contract.id,
                event_type=EventType.period_interest,
                amount=monthly_rate.quantize(Decimal("0.0001")),
                period_index=i,
                created_at=_ago(days=190 - i * 30),
            )
        )
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=contract.id,
                event_type=EventType.payment_applied,
                amount=Decimal("180.0000"),
                period_index=i,
                created_at=_ago(days=190 - i * 30) + timedelta(days=1),
            )
        )
    events.append(
        DebtEvent(
            id=uuid4(),
            contract_id=contract.id,
            event_type=EventType.buyout_paid,
            amount=Decimal("0.0000"),
            period_index=None,
            created_at=_ago(days=15),
            note="Final buyout settled in full",
        )
    )
    for ev in events:
        s.add(ev)
        if ev.event_type == EventType.payment_applied:
            await _add_validated(
                s,
                sub=sub,
                goddess_id=goddess_id,
                method_id=bank_id,
                amount=Decimal("180.00"),
                category=PaymentCategory.debt_payment,
                target_type=AllocationTargetType.contract_debt,
                target_id=contract.id,
                days_ago=190 - (ev.period_index or 0) * 30,
            )
    await _add_validated(
        s,
        sub=sub,
        goddess_id=goddess_id,
        method_id=bank_id,
        amount=Decimal("2200.00"),
        category=PaymentCategory.buyout,
        target_type=AllocationTargetType.contract_buyout,
        target_id=contract.id,
        days_ago=15,
        note="Buyout payment.",
    )
    contract.balance = Decimal("0.00")
    return sub


async def _seed_jack(
    s: AsyncSession, goddess_id: UUID, goddess_user_id: UUID, paypal_id: UUID
) -> User:
    """Breached: contract → breached, blacklist entry open."""
    sub = _make_sub(
        goddess_id,
        "sub_jack",
        "Jack",
        "King",
        status=UserStatus.blacklisted,
        days_old=120,
        avatar_key=AvatarKey.dark_2,
    )
    s.add(sub)
    await s.flush()
    contract = _contract(
        sub_id=sub.id,
        goddess_id=goddess_id,
        principal=Decimal("1500.00"),
        monthly_rate=Decimal("0.090000"),
        duration_periods=12,
        minimum_payment=Decimal("160.00"),
        frequency=PaymentFrequency.monthly,
        severity=LatePenaltySeverity.severe,
        late_pct=Decimal("0.15"),
        status=DebtContractStatus.breached,
        days_old=110,
        signed_days_ago=100,
    )
    s.add(contract)
    version = _version_from_contract(contract, goddess_user_id, round_no=0)
    s.add(version)
    await s.flush()
    contract.current_version_id = version.id

    s.add_all(
        [
            _audit(
                contract.id,
                goddess_user_id,
                DebtContractEventType.proposed,
                to_status=DebtContractStatus.pending_sub,
                when=contract.created_at,
            ),
            _audit(
                contract.id,
                sub.id,
                DebtContractEventType.signed,
                from_status=DebtContractStatus.pending_sub,
                to_status=DebtContractStatus.active,
                when=contract.signed_at or contract.created_at,
            ),
            _audit(
                contract.id,
                goddess_user_id,
                DebtContractEventType.breached,
                from_status=DebtContractStatus.active,
                to_status=DebtContractStatus.breached,
                note="Two missed payments + ghosting",
                when=_ago(days=20),
            ),
        ]
    )
    monthly_rate = Decimal("0.090000")
    events: list[DebtEvent] = []
    for i in range(1, 4):
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=contract.id,
                event_type=EventType.period_interest,
                amount=monthly_rate.quantize(Decimal("0.0001")),
                period_index=i,
                created_at=_ago(days=100 - i * 30),
            )
        )
    events.append(
        DebtEvent(
            id=uuid4(),
            contract_id=contract.id,
            event_type=EventType.payment_applied,
            amount=Decimal("160.0000"),
            period_index=1,
            created_at=_ago(days=68),
        )
    )
    events.append(
        DebtEvent(
            id=uuid4(),
            contract_id=contract.id,
            event_type=EventType.late_penalty,
            amount=Decimal("0.1500"),
            period_index=2,
            created_at=_ago(days=35),
        )
    )
    events.append(
        DebtEvent(
            id=uuid4(),
            contract_id=contract.id,
            event_type=EventType.late_penalty,
            amount=Decimal("0.1500"),
            period_index=3,
            created_at=_ago(days=22),
        )
    )
    for ev in events:
        s.add(ev)
    await _add_validated(
        s,
        sub=sub,
        goddess_id=goddess_id,
        method_id=paypal_id,
        amount=Decimal("160.00"),
        category=PaymentCategory.debt_payment,
        target_type=AllocationTargetType.contract_debt,
        target_id=contract.id,
        days_ago=68,
    )
    final_balance = replay_events(contract.principal, events)
    contract.balance = final_balance

    s.add(
        BlacklistEntry(
            id=uuid4(),
            goddess_id=goddess_id,
            sub_id=sub.id,
            reason="Two missed monthly debt payments + no replies.",
            balance_snapshot=final_balance,
            reinstatement_fee_paid=None,
            breached_at=_ago(days=20),
            forgiven_at=None,
            created_at=_ago(days=20),
        )
    )
    s.add(
        _notif(
            goddess_user_id,
            NotificationType.contract_breached,
            "Contract breached",
            f"{sub.username} breached: £{final_balance} owed at breach.",
            "/goddess/blacklist",
            days_ago=20,
            read=True,
        )
    )
    return sub


async def _seed_kev(s: AsyncSession, goddess_id: UUID, throne_id: UUID) -> User:
    """Reinstated: was blacklisted, paid reinstatement fee, now active again with rolling."""
    sub = _make_sub(
        goddess_id, "sub_kev", "Kev", "Lloyd", days_old=180, avatar_key=AvatarKey.accent_1
    )
    s.add(sub)
    await s.flush()
    rolling = _rolling(sub.id, goddess_id, amount=Decimal("100.00"), last_paid_days_ago=4)
    s.add(rolling)
    s.add(
        BlacklistEntry(
            id=uuid4(),
            goddess_id=goddess_id,
            sub_id=sub.id,
            reason="Ghosted last spring; fully reinstated since.",
            balance_snapshot=Decimal("0.00"),
            reinstatement_fee_paid=Decimal("250.00"),
            breached_at=_ago(days=120),
            forgiven_at=_ago(days=80),
            created_at=_ago(days=120),
        )
    )
    await _add_validated(
        s,
        sub=sub,
        goddess_id=goddess_id,
        method_id=throne_id,
        amount=Decimal("250.00"),
        category=PaymentCategory.tribute,
        target_type=AllocationTargetType.tribute,
        target_id=None,
        days_ago=80,
        note="Reinstatement fee.",
    )
    for weeks in (8, 6, 4, 2):
        await _add_validated(
            s,
            sub=sub,
            goddess_id=goddess_id,
            method_id=throne_id,
            amount=Decimal("100.00"),
            category=PaymentCategory.rolling,
            target_type=AllocationTargetType.rolling_cycle,
            target_id=rolling.id,
            days_ago=weeks * 7,
        )
    return sub


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


async def seed_fake_data() -> None:
    async with SessionMaker() as session:
        if await _existing(session):
            print("seed_fake_data: subs already present — skipping")
            return
        goddess, goddess_user = await _get_goddess(session)
        global _goddess_user_id
        _goddess_user_id = goddess_user.id
        if goddess.display_name != "Mean Mal":
            goddess.display_name = "Mean Mal"
            session.add(goddess)

        methods = _payment_methods(goddess.id)
        for m in methods:
            session.add(m)
        throne_id, paypal_id, bank_id, _crypto_id = (m.id for m in methods)

        await session.flush()
        for fn in (
            _seed_alex(session, goddess.id, throne_id),
            _seed_ben(session, goddess.id, paypal_id),
            _seed_chris(session, goddess.id, goddess_user.id, throne_id),
            _seed_dan(session, goddess.id, goddess_user.id),
            _seed_eli(session, goddess.id, goddess_user.id, paypal_id),
            _seed_fred(session, goddess.id, goddess_user.id),
            _seed_gary(session, goddess.id, goddess_user.id),
            _seed_henry(session, goddess.id, goddess_user.id),
            _seed_ian(session, goddess.id, goddess_user.id, bank_id),
            _seed_jack(session, goddess.id, goddess_user.id, paypal_id),
            _seed_kev(session, goddess.id, throne_id),
        ):
            await fn
            await session.flush()

        session.add(
            Invitation(
                id=uuid4(),
                token="inv-pending-" + uuid4().hex[:8],
                goddess_id=goddess.id,
                entry_tribute_amount=Decimal("100.00"),
                note="Pending invitation, sent on Twitter.",
                expires_at=_ahead(days=14),
                created_at=_ago(days=1),
            )
        )
        session.add(
            Invitation(
                id=uuid4(),
                token="inv-expired-" + uuid4().hex[:8],
                goddess_id=goddess.id,
                entry_tribute_amount=Decimal("75.00"),
                note="Never claimed, expired.",
                expires_at=_ago(days=3),
                created_at=_ago(days=20),
            )
        )

        await session.commit()
    print("seed_fake_data: 11 subs + payment methods + invitations seeded.")


if __name__ == "__main__":
    import asyncio

    asyncio.run(seed_fake_data())


# Silence "imported but unused" for re-exports of dt aliases used implicitly above.
_ = (dt,)
