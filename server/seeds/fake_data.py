"""Seed realistic dev data: 6 subs from the frozen cast.

Idempotent — checks for `sub_chris` and skips if already present.
All dates anchor to FROZEN_TODAY; no datetime.now() calls.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
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
    generate_contract_slug,
)
from models.debt_event import DebtEvent, EventType
from models.invitation import Invitation
from models.journal_entry import JournalEntry, JournalMood
from models.payment import (
    AllocationTargetType,
    DeclarationSource,
    PaymentAllocation,
    PaymentCategory,
    PaymentDeclaration,
    PaymentStatus,
)
from models.payment_method import PaymentMethod, PaymentMethodType
from models.ritual import Ritual, RitualFrequency
from models.rolling import DeadlineDay, RollingTribute
from models.sub_kink_rating import KinkRating, SubKinkRating
from models.sub_limit import LimitKind, LimitSeverity, SubLimit
from models.sub_photo import SubPhoto, SubPhotoStatus
from models.sub_profile import OwnershipStatus, SubProfile
from models.user import Goddess, User, UserRole, UserStatus
from seeds.cast import CAST, FROZEN_TODAY, CastEntry
from seeds.content import (
    BEN_JOURNAL_BODIES,
    CHRIS_JOURNAL_BODIES,
    DAN_JOURNAL_BODIES,
    ELI_JOURNAL_BODIES,
    REJECT_REASONS,
)
from seeds.timeline import (
    ben_journal_dates,
    ben_rolling_dates,
    chris_journal_dates,
    chris_rolling_dates,
    contract_closed_dt,
    contract_signed_dt,
    dan_journal_dates,
    dan_rolling_dates,
    eli_journal_dates,
    frozen_dt,
    frozen_now,
    photo_upload_dates,
)
from utils.ledger import replay_events

log = structlog.get_logger()

SUB_PASSWORD = "ChangeMe!Dev123"

# Methods seeded: Revolut, PayPal, IBAN, Revolut-2 (alias for alternation)
_REVOLUT = 0
_PAYPAL = 1
_IBAN = 2

_goddess_user_id: UUID | None = None


def _gud() -> UUID:
    assert _goddess_user_id is not None
    return _goddess_user_id


def _dt(d: date, t: time = time(9, 0)) -> datetime:
    return frozen_dt(d, t)


def _now() -> datetime:
    return frozen_now(FROZEN_TODAY)


def _ago(days: int) -> datetime:
    return _now() - timedelta(days=days)


async def _existing(session: AsyncSession) -> bool:
    result = await session.execute(select(User).where(col(User.username) == "sub_chris"))
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


def _make_sub(
    goddess_id: UUID,
    entry: CastEntry,
    *,
    status: UserStatus | None = None,
) -> User:
    e = entry
    created = _dt(e.account_created, time(10, 30))
    return User(
        id=uuid4(),
        goddess_id=goddess_id,
        username=e.username,
        email=f"{e.username}@subs.local",
        password_hash=hash_password(SUB_PASSWORD),
        role=UserRole.sub,
        status=status or e.status,
        first_name=e.first_name,
        last_name=e.last_name,
        twitter_handle=e.twitter_handle,
        source_note=e.source_note,
        theme_preference="dark",
        avatar_key=e.avatar_key,
        payment_handle=e.payment_handle,
        created_at=created,
    )


def _payment_methods(goddess_id: UUID) -> list[PaymentMethod]:
    base = _ago(200)
    return [
        PaymentMethod(
            id=uuid4(),
            goddess_id=goddess_id,
            name="Revolut",
            type=PaymentMethodType.revolut,
            handle_or_link="@meanmal",
            note="Primary method; instant confirmation.",
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
            note="Reference must include your username.",
            enabled=True,
            sort_order=2,
            created_at=base,
            updated_at=base,
        ),
    ]


def _rolling(
    sub_id: UUID,
    goddess_id: UUID,
    *,
    amount: Decimal,
    day: DeadlineDay,
    last_paid_at: datetime | None,
    created_at: datetime,
    notes: str | None = None,
) -> RollingTribute:
    return RollingTribute(
        id=uuid4(),
        sub_id=sub_id,
        goddess_id=goddess_id,
        amount=float(amount),
        deadline_day=day,
        deadline_time=time(20, 0),
        late_multiplier_per_day=1,
        paused=False,
        notes=notes,
        last_paid_at=last_paid_at,
        created_at=created_at,
        updated_at=last_paid_at or created_at,
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
    declared_at: datetime,
    source: DeclarationSource = DeclarationSource.sub_declared,
    note: str | None = None,
) -> None:
    validated_at = declared_at + timedelta(hours=4)
    decl = PaymentDeclaration(
        id=uuid4(),
        sub_id=sub.id,
        goddess_id=goddess_id,
        method_id=method_id,
        amount=float(amount),
        external_timestamp=declared_at,
        note=note,
        category=category,
        status=PaymentStatus.validated,
        target_id=target_id,
        created_by=sub.id,
        declared_at=declared_at,
        validated_at=validated_at,
        validated_by=_gud(),
        source=source,
    )
    alloc = PaymentAllocation(
        id=uuid4(),
        declaration_id=decl.id,
        target_type=target_type,
        target_id=target_id,
        amount=float(amount),
        allocated_at=validated_at,
    )
    s.add(decl)
    await s.flush()
    s.add(alloc)


def _rejected_declaration(
    *,
    sub: User,
    goddess_id: UUID,
    method_id: UUID,
    amount: Decimal,
    category: PaymentCategory,
    target_id: UUID | None,
    declared_at: datetime,
    rejection_reason: str,
) -> PaymentDeclaration:
    return PaymentDeclaration(
        id=uuid4(),
        sub_id=sub.id,
        goddess_id=goddess_id,
        method_id=method_id,
        amount=float(amount),
        external_timestamp=declared_at,
        category=category,
        status=PaymentStatus.rejected,
        target_id=target_id,
        created_by=sub.id,
        declared_at=declared_at,
        validated_at=declared_at + timedelta(hours=6),
        validated_by=_gud(),
        rejection_reason=rejection_reason,
        source=DeclarationSource.sub_declared,
    )


def _pending_declaration(
    *,
    sub: User,
    goddess_id: UUID,
    method_id: UUID,
    amount: Decimal,
    category: PaymentCategory,
    target_id: UUID | None,
    declared_at: datetime,
    source: DeclarationSource = DeclarationSource.sub_declared,
    note: str | None = None,
) -> PaymentDeclaration:
    return PaymentDeclaration(
        id=uuid4(),
        sub_id=sub.id,
        goddess_id=goddess_id,
        method_id=method_id,
        amount=float(amount),
        external_timestamp=declared_at,
        note=note,
        category=category,
        status=PaymentStatus.pending,
        target_id=target_id,
        created_by=sub.id,
        declared_at=declared_at,
        validated_by=None,
        source=source,
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
    status: DebtContractStatus,
    created_at: datetime,
    signed_at: datetime | None = None,
) -> DebtContract:
    exit_amt = principal * Decimal("1.25")
    return DebtContract(
        id=uuid4(),
        slug=generate_contract_slug(),
        sub_id=sub_id,
        goddess_id=goddess_id,
        sub_initiated=False,
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
        created_at=created_at,
        updated_at=created_at,
        signed_at=signed_at,
        signature_b64=(
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
            if signed_at
            else None
        ),
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
    when: datetime,
) -> DebtContractAudit:
    return DebtContractAudit(
        id=uuid4(),
        contract_id=contract_id,
        event_type=event_type,
        actor_id=actor_id,
        from_status=from_status,
        to_status=to_status,
        note=note,
        created_at=when,
    )


def _profile(sub_id: UUID, *, joined_at: datetime, ownership: OwnershipStatus) -> SubProfile:
    return SubProfile(
        user_id=sub_id,
        joined_empire_at=joined_at,
        ownership_status=ownership,
        updated_at=joined_at,
    )


def _photo(
    sub_id: UUID,
    goddess_id: UUID,
    *,
    uploaded_at: datetime,
    status: SubPhotoStatus = SubPhotoStatus.pending,
    idx: int = 0,
) -> SubPhoto:
    return SubPhoto(
        id=uuid4(),
        sub_id=sub_id,
        goddess_id=goddess_id,
        r2_key=f"sub-photos/{sub_id}/{idx}.jpg",
        mime_type="image/jpeg",
        byte_size=102400 + idx * 4096,
        status=status,
        uploaded_at=uploaded_at,
        reviewed_at=None if status == SubPhotoStatus.pending else uploaded_at + timedelta(hours=3),
        reviewed_by=_gud() if status != SubPhotoStatus.pending else None,
    )


def _journal(
    sub_id: UUID,
    goddess_id: UUID,
    *,
    created_at: datetime,
    body: str,
    mood: JournalMood,
) -> JournalEntry:
    return JournalEntry(
        id=uuid4(),
        sub_id=sub_id,
        goddess_id=goddess_id,
        body=body,
        mood=mood,
        created_at=created_at,
    )


def _kink_rating(
    sub_id: UUID,
    goddess_id: UUID,
    *,
    item_id: UUID,
    rating: KinkRating,
    created_at: datetime,
) -> SubKinkRating:
    return SubKinkRating(
        id=uuid4(),
        sub_id=sub_id,
        goddess_id=goddess_id,
        item_id=item_id,
        rating=rating,
        created_at=created_at,
        updated_at=created_at,
    )


def _limit(
    sub_id: UUID,
    goddess_id: UUID,
    *,
    kind: LimitKind,
    body: str,
    severity: LimitSeverity,
    created_at: datetime,
) -> SubLimit:
    return SubLimit(
        id=uuid4(),
        sub_id=sub_id,
        goddess_id=goddess_id,
        kind=kind,
        body=body,
        severity=severity,
        created_at=created_at,
        updated_at=created_at,
    )


def _ritual(
    sub_id: UUID,
    goddess_id: UUID,
    *,
    title: str,
    frequency: RitualFrequency,
    description: str | None = None,
    created_at: datetime,
) -> Ritual:
    return Ritual(
        id=uuid4(),
        sub_id=sub_id,
        goddess_id=goddess_id,
        title=title,
        description=description,
        frequency=frequency,
        created_at=created_at,
        updated_at=created_at,
    )


# ---------------------------------------------------------------------------
# Kink item lookups (by slug, resolved lazily after kinks.py has seeded)
# ---------------------------------------------------------------------------


async def _kink_items(session: AsyncSession) -> dict[str, UUID]:
    from models.kink_item import KinkItem

    result = await session.execute(select(KinkItem))
    return {item.slug: item.id for item in result.scalars().all()}


# ---------------------------------------------------------------------------
# Per-sub builders
# ---------------------------------------------------------------------------


async def _seed_chris(
    s: AsyncSession,
    goddess_id: UUID,
    goddess_user_id: UUID,
    methods: list[PaymentMethod],
    kinks: dict[str, UUID],
) -> None:
    entry = CAST["sub_chris"]
    sub = _make_sub(goddess_id, entry)
    s.add(sub)
    await s.flush()

    joined_at = _dt(entry.account_created, time(10, 30))
    s.add(_profile(sub.id, joined_at=joined_at, ownership=OwnershipStatus.collared))

    # Rolling tribute — weekly Monday £80, last paid last Monday
    roll_dates = chris_rolling_dates(FROZEN_TODAY)
    last_paid = _dt(roll_dates[-1], time(20, 30))
    rolling = _rolling(
        sub.id,
        goddess_id,
        amount=Decimal("80.00"),
        day=DeadlineDay.mon,
        last_paid_at=last_paid,
        created_at=_dt(entry.account_created + timedelta(days=7), time(11, 0)),
    )
    s.add(rolling)
    await s.flush()

    # 22 weekly payments: alternating Revolut (10), PayPal (7), IBAN (5)
    # Pattern: R R P R R P R P R P R I R R I R P R I R R I
    interleaved = [
        _REVOLUT,
        _REVOLUT,
        _PAYPAL,
        _REVOLUT,
        _REVOLUT,
        _PAYPAL,
        _REVOLUT,
        _PAYPAL,
        _REVOLUT,
        _PAYPAL,
        _REVOLUT,
        _IBAN,
        _REVOLUT,
        _REVOLUT,
        _IBAN,
        _REVOLUT,
        _PAYPAL,
        _REVOLUT,
        _IBAN,
        _REVOLUT,
        _REVOLUT,
        _IBAN,
    ]
    assert len(interleaved) == 22  # noqa: S101
    for i, (d, m_idx) in enumerate(zip(roll_dates, interleaved, strict=True)):
        declared_at = _dt(d, time(8, 45))
        source = DeclarationSource.sub_declared
        # A few goddess-recorded bonus payments instead of the standard £80
        if i in (4, 11, 18):
            bonus = Decimal("100.00") if i != 18 else Decimal("150.00")
            await _add_validated(
                s,
                sub=sub,
                goddess_id=goddess_id,
                method_id=methods[m_idx].id,
                amount=bonus,
                category=PaymentCategory.tribute,
                target_type=AllocationTargetType.tribute,
                target_id=None,
                declared_at=declared_at,
                source=DeclarationSource.goddess_recorded,
                note="Bonus tribute.",
            )
        else:
            await _add_validated(
                s,
                sub=sub,
                goddess_id=goddess_id,
                method_id=methods[m_idx].id,
                amount=Decimal("80.00"),
                category=PaymentCategory.rolling,
                target_type=AllocationTargetType.rolling_cycle,
                target_id=rolling.id,
                declared_at=declared_at,
                source=source,
            )

    # Closed contract: signed 2025-11-02, closed 2026-02-15
    closed_signed = contract_signed_dt(date(2025, 11, 2))
    closed_contract = _contract(
        sub_id=sub.id,
        goddess_id=goddess_id,
        principal=Decimal("600.00"),
        monthly_rate=Decimal("0.050000"),
        duration_periods=12,
        minimum_payment=Decimal("80.00"),
        frequency=PaymentFrequency.weekly,
        status=DebtContractStatus.closed,
        created_at=closed_signed - timedelta(days=2),
        signed_at=closed_signed,
    )
    closed_contract.balance = Decimal("0.00")
    s.add(closed_contract)
    cv0 = _version_from_contract(closed_contract, goddess_user_id, round_no=0)
    s.add(cv0)
    await s.flush()
    closed_contract.current_version_id = cv0.id
    closed_at = contract_closed_dt(date(2026, 2, 15))
    s.add_all(
        [
            _audit(
                closed_contract.id,
                goddess_user_id,
                DebtContractEventType.proposed,
                to_status=DebtContractStatus.pending_sub,
                when=closed_signed - timedelta(days=2),
            ),
            _audit(
                closed_contract.id,
                sub.id,
                DebtContractEventType.signed,
                from_status=DebtContractStatus.pending_sub,
                to_status=DebtContractStatus.active,
                when=closed_signed,
            ),
            _audit(
                closed_contract.id,
                goddess_user_id,
                DebtContractEventType.closed,
                from_status=DebtContractStatus.active,
                to_status=DebtContractStatus.closed,
                note="Paid in full ahead of schedule.",
                when=closed_at,
            ),
        ]
    )

    # Active contract: signed 2026-02-20, ~70% repaid
    active_signed = contract_signed_dt(date(2026, 2, 20))
    active_principal = Decimal("800.00")
    active_contract = _contract(
        sub_id=sub.id,
        goddess_id=goddess_id,
        principal=active_principal,
        monthly_rate=Decimal("0.050000"),
        duration_periods=12,
        minimum_payment=Decimal("100.00"),
        frequency=PaymentFrequency.weekly,
        status=DebtContractStatus.active,
        created_at=active_signed - timedelta(days=3),
        signed_at=active_signed,
    )
    s.add(active_contract)
    av0 = _version_from_contract(active_contract, goddess_user_id, round_no=0)
    s.add(av0)
    await s.flush()
    active_contract.current_version_id = av0.id
    s.add_all(
        [
            _audit(
                active_contract.id,
                goddess_user_id,
                DebtContractEventType.proposed,
                to_status=DebtContractStatus.pending_sub,
                when=active_signed - timedelta(days=3),
            ),
            _audit(
                active_contract.id,
                sub.id,
                DebtContractEventType.signed,
                from_status=DebtContractStatus.pending_sub,
                to_status=DebtContractStatus.active,
                when=active_signed,
            ),
        ]
    )

    # ~70% repaid — weeks since 2026-02-20 to 2026-04-17 ≈ 8 weeks
    weekly_rate = Decimal("0.050000") * Decimal("12") / Decimal("52")
    events: list[DebtEvent] = []
    weeks_active = 8
    payment_start = date(2026, 2, 23)  # first Monday after signing
    for i in range(1, weeks_active + 1):
        pay_date = payment_start + timedelta(weeks=i - 1)
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=active_contract.id,
                event_type=EventType.period_interest,
                amount=weekly_rate.quantize(Decimal("0.0001")),
                period_index=i,
                created_at=_dt(pay_date, time(0, 1)),
            )
        )
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=active_contract.id,
                event_type=EventType.payment_applied,
                amount=Decimal("100.0000"),
                period_index=i,
                created_at=_dt(pay_date, time(9, 30)),
            )
        )
    for ev in events:
        s.add(ev)
        if ev.event_type == EventType.payment_applied:
            m_idx = (
                interleaved[ev.period_index - 1]
                if ev.period_index and ev.period_index <= 8
                else _REVOLUT
            )
            await _add_validated(
                s,
                sub=sub,
                goddess_id=goddess_id,
                method_id=methods[m_idx].id,
                amount=Decimal("100.00"),
                category=PaymentCategory.weekly_debt,
                target_type=AllocationTargetType.contract_debt,
                target_id=active_contract.id,
                declared_at=ev.created_at,
            )
    active_contract.balance = replay_events(active_principal, events)

    # Adjustment request (pending)
    s.add(
        ContractAdjustment(
            id=uuid4(),
            contract_id=active_contract.id,
            proposed_by=goddess_user_id,
            amount=Decimal("50.00"),
            reason="Penalty waiver from week 3 — formalising the agreed exception.",
            status=AdjustmentStatus.pending_sub_approval,
            created_at=_ago(3),
            updated_at=_ago(3),
        )
    )

    # Photos: 5 uploads, all approved (Chris is "perfectly up-to-date")
    for idx, d in enumerate(photo_upload_dates(FROZEN_TODAY, 5, base_offset=120)):
        s.add(
            _photo(
                sub.id,
                goddess_id,
                uploaded_at=_dt(d, time(18, 0)),
                status=SubPhotoStatus.approved,
                idx=idx,
            )
        )

    # Journal: 12 entries
    for spec, d in zip(CHRIS_JOURNAL_BODIES, chris_journal_dates(FROZEN_TODAY), strict=False):
        s.add(
            _journal(
                sub.id, goddess_id, created_at=_dt(d, time(21, 15)), body=spec.body, mood=spec.mood
            )
        )

    # Kinks: 18 across bondage_restraints, impact_play, humiliation_degradation, service_worship
    kink_assignments: list[tuple[str, KinkRating]] = [
        ("rope", KinkRating.loves),
        ("cuffs", KinkRating.loves),
        ("mummification", KinkRating.curious),
        ("hogtie", KinkRating.loves),
        ("suspension", KinkRating.soft_limit),
        ("spanking", KinkRating.fetish_need),
        ("caning", KinkRating.loves),
        ("flogging", KinkRating.loves),
        ("paddle", KinkRating.curious),
        ("belt", KinkRating.loves),
        ("verbal", KinkRating.loves),
        ("public", KinkRating.soft_limit),
        ("inspection", KinkRating.loves),
        ("exposure", KinkRating.curious),
        ("forced_feminization", KinkRating.hard_limit),
        ("foot", KinkRating.loves),
        ("body", KinkRating.fetish_need),
        ("financial", KinkRating.loves),
    ]
    kink_t = _dt(entry.account_created + timedelta(days=14), time(20, 0))
    for slug, rating in kink_assignments:
        if slug in kinks:
            s.add(
                _kink_rating(
                    sub.id, goddess_id, item_id=kinks[slug], rating=rating, created_at=kink_t
                )
            )

    # Limits: 4 (hard + soft mix)
    limit_t = kink_t
    for kind, body, severity in [
        (LimitKind.hard, "No blood play of any kind.", LimitSeverity.high),
        (LimitKind.hard, "No permanent marks or scarring.", LimitSeverity.high),
        (LimitKind.soft, "Suspension bondage only with prior discussion.", LimitSeverity.medium),
        (LimitKind.soft, "Public humiliation limited to online contexts.", LimitSeverity.low),
    ]:
        s.add(
            _limit(sub.id, goddess_id, kind=kind, body=body, severity=severity, created_at=limit_t)
        )

    # Ritual: daily morning collar selfie
    s.add(
        _ritual(
            sub.id,
            goddess_id,
            title="Morning collar selfie",
            frequency=RitualFrequency.daily,
            description="Photo of collar before 9am, sent to the app.",
            created_at=_dt(entry.account_created + timedelta(days=14), time(11, 0)),
        )
    )


async def _seed_dan(
    s: AsyncSession,
    goddess_id: UUID,
    goddess_user_id: UUID,
    methods: list[PaymentMethod],
    kinks: dict[str, UUID],
) -> None:
    entry = CAST["sub_dan"]
    sub = _make_sub(goddess_id, entry)
    s.add(sub)
    await s.flush()

    joined_at = _dt(entry.account_created, time(10, 30))
    s.add(_profile(sub.id, joined_at=joined_at, ownership=OwnershipStatus.in_training))

    roll_dates = dan_rolling_dates(FROZEN_TODAY)
    # Force last_paid_at to most recent Friday at/after 20:00 relative to FROZEN_TODAY.
    # roll_dates[-1] lands on 2026-04-02 (too old); override independently so Dan is on time.
    last_paid = _dt(date(2026, 4, 10), time(20, 30))
    rolling = _rolling(
        sub.id,
        goddess_id,
        amount=Decimal("120.00"),
        day=DeadlineDay.fri,
        last_paid_at=last_paid,
        created_at=_dt(entry.account_created + timedelta(days=5), time(14, 0)),
    )
    s.add(rolling)
    await s.flush()

    # 14 payments: 60% sub_declared, 40% goddess_recorded
    for i, d in enumerate(roll_dates):
        declared_at = _dt(d, time(13, 0))
        source = (
            DeclarationSource.sub_declared if i % 5 != 4 else DeclarationSource.goddess_recorded
        )
        m_idx = _PAYPAL if i % 3 != 2 else _REVOLUT
        await _add_validated(
            s,
            sub=sub,
            goddess_id=goddess_id,
            method_id=methods[m_idx].id,
            amount=Decimal("120.00"),
            category=PaymentCategory.rolling,
            target_type=AllocationTargetType.rolling_cycle,
            target_id=rolling.id,
            declared_at=declared_at,
            source=source,
        )

    # Active contract: signed 2026-03-10, ~15% repaid
    signed_at = contract_signed_dt(date(2026, 3, 10))
    principal = Decimal("1000.00")
    contract = _contract(
        sub_id=sub.id,
        goddess_id=goddess_id,
        principal=principal,
        monthly_rate=Decimal("0.080000"),
        duration_periods=10,
        minimum_payment=Decimal("120.00"),
        frequency=PaymentFrequency.weekly,
        severity=LatePenaltySeverity.severe,
        late_pct=Decimal("0.10"),
        status=DebtContractStatus.active,
        created_at=signed_at - timedelta(days=3),
        signed_at=signed_at,
    )
    s.add(contract)
    v0 = _version_from_contract(contract, goddess_user_id, round_no=0)
    s.add(v0)
    await s.flush()
    contract.current_version_id = v0.id
    s.add_all(
        [
            _audit(
                contract.id,
                goddess_user_id,
                DebtContractEventType.proposed,
                to_status=DebtContractStatus.pending_sub,
                when=signed_at - timedelta(days=3),
            ),
            _audit(
                contract.id,
                sub.id,
                DebtContractEventType.signed,
                from_status=DebtContractStatus.pending_sub,
                to_status=DebtContractStatus.active,
                when=signed_at,
            ),
        ]
    )

    # ~15% repaid: 2 payments + 2 late fees
    weekly_rate = Decimal("0.080000") * Decimal("12") / Decimal("52")
    events: list[DebtEvent] = []
    # 5 weeks since signing; paid weeks 1 and 2, missed 3 and 4 (late fees), paid week 5
    pay_start = date(2026, 3, 14)
    for i in range(1, 6):
        pay_date = pay_start + timedelta(weeks=i - 1)
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=contract.id,
                event_type=EventType.period_interest,
                amount=weekly_rate.quantize(Decimal("0.0001")),
                period_index=i,
                created_at=_dt(pay_date, time(0, 1)),
            )
        )
    # Payments on weeks 1, 2, 5
    for i in (1, 2, 5):
        pay_date = pay_start + timedelta(weeks=i - 1)
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=contract.id,
                event_type=EventType.payment_applied,
                amount=Decimal("120.0000"),
                period_index=i,
                created_at=_dt(pay_date, time(12, 0)),
            )
        )
    # Late fees on weeks 3 and 4
    for i in (3, 4):
        pay_date = pay_start + timedelta(weeks=i - 1) + timedelta(days=3)
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=contract.id,
                event_type=EventType.late_penalty,
                amount=Decimal("0.1000"),
                period_index=i,
                created_at=_dt(pay_date, time(2, 0)),
                note="Missed weekly payment — 10% late penalty.",
            )
        )
    for ev in events:
        s.add(ev)
        if ev.event_type == EventType.payment_applied:
            await _add_validated(
                s,
                sub=sub,
                goddess_id=goddess_id,
                method_id=methods[_PAYPAL].id,
                amount=Decimal("120.00"),
                category=PaymentCategory.weekly_debt,
                target_type=AllocationTargetType.contract_debt,
                target_id=contract.id,
                declared_at=ev.created_at,
                source=DeclarationSource.sub_declared,
            )
    contract.balance = replay_events(principal, events)

    # Pending sub_declared payment in validation queue (spec: 1 pending for Dan)
    s.add(
        _pending_declaration(
            sub=sub,
            goddess_id=goddess_id,
            method_id=methods[_PAYPAL].id,
            amount=Decimal("120.00"),
            category=PaymentCategory.rolling,
            target_id=rolling.id,
            declared_at=_ago(1),
            source=DeclarationSource.sub_declared,
            note="Weekly rolling — screenshot attached.",
        )
    )

    # Photos: 4 uploads, 1 pending
    for idx, d in enumerate(photo_upload_dates(FROZEN_TODAY, 4, base_offset=80)):
        status = SubPhotoStatus.approved if idx < 3 else SubPhotoStatus.pending
        s.add(_photo(sub.id, goddess_id, uploaded_at=_dt(d, time(17, 30)), status=status, idx=idx))

    # Journal: 6 entries
    for spec, d in zip(DAN_JOURNAL_BODIES, dan_journal_dates(FROZEN_TODAY), strict=False):
        s.add(
            _journal(
                sub.id, goddess_id, created_at=_dt(d, time(22, 0)), body=spec.body, mood=spec.mood
            )
        )

    # Kinks: 9 across humiliation_degradation and service_worship
    kink_assignments: list[tuple[str, KinkRating]] = [
        ("verbal", KinkRating.fetish_need),
        ("public", KinkRating.loves),
        ("forced_feminization", KinkRating.curious),
        ("exposure", KinkRating.loves),
        ("inspection", KinkRating.loves),
        ("financial", KinkRating.fetish_need),
        ("domestic", KinkRating.loves),
        ("foot", KinkRating.curious),
        ("objectification", KinkRating.loves),
    ]
    kink_t = _dt(entry.account_created + timedelta(days=10), time(19, 30))
    for slug, rating in kink_assignments:
        if slug in kinks:
            s.add(
                _kink_rating(
                    sub.id, goddess_id, item_id=kinks[slug], rating=rating, created_at=kink_t
                )
            )

    # Limits: 2 soft
    for body, severity in [
        ("No content involving third parties without prior consent.", LimitSeverity.medium),
        ("Financial control limited to agreed tribute schedule.", LimitSeverity.low),
    ]:
        s.add(
            _limit(
                sub.id,
                goddess_id,
                kind=LimitKind.soft,
                body=body,
                severity=severity,
                created_at=kink_t,
            )
        )

    # Ritual: weekly Sunday tribute pic
    s.add(
        _ritual(
            sub.id,
            goddess_id,
            title="Sunday tribute pic",
            frequency=RitualFrequency.weekly,
            description="Photo proof of tribute sent, every Sunday before 22:00.",
            created_at=_dt(entry.account_created + timedelta(days=10), time(15, 0)),
        )
    )


async def _seed_ben(
    s: AsyncSession,
    goddess_id: UUID,
    goddess_user_id: UUID,
    methods: list[PaymentMethod],
    kinks: dict[str, UUID],
) -> None:
    entry = CAST["sub_ben"]
    sub = _make_sub(goddess_id, entry)
    s.add(sub)
    await s.flush()

    joined_at = _dt(entry.account_created, time(10, 30))
    s.add(_profile(sub.id, joined_at=joined_at, ownership=OwnershipStatus.owned))

    roll_dates = ben_rolling_dates(FROZEN_TODAY)
    # Last payment was 7 days ago (ben is currently late)
    last_paid_date = FROZEN_TODAY - timedelta(days=7)
    last_paid = _dt(last_paid_date, time(14, 0))
    rolling = _rolling(
        sub.id,
        goddess_id,
        amount=Decimal("640.00"),
        day=DeadlineDay.fri,
        last_paid_at=last_paid,
        created_at=_dt(entry.account_created + timedelta(days=5), time(9, 0)),
        notes="Heavy rolling. Has a history of 2-3 week gaps.",
    )
    s.add(rolling)
    await s.flush()

    # 8 payments, 100% sub_declared; 2 rejections embedded
    for i, d in enumerate(roll_dates):
        declared_at = _dt(d, time(14, 0))
        if i in (2, 6):
            # Rejected: screenshot illegible
            reason = (
                REJECT_REASONS[0]
                if i == 2
                else "Photo blurred — please retake the screenshot at full brightness and resubmit."
            )
            s.add(
                _rejected_declaration(
                    sub=sub,
                    goddess_id=goddess_id,
                    method_id=methods[_PAYPAL].id,
                    amount=Decimal("640.00"),
                    category=PaymentCategory.rolling,
                    target_id=rolling.id,
                    declared_at=declared_at,
                    rejection_reason=reason,
                )
            )
            # Resubmitted and validated same day + 2h
            await _add_validated(
                s,
                sub=sub,
                goddess_id=goddess_id,
                method_id=methods[_PAYPAL].id,
                amount=Decimal("640.00"),
                category=PaymentCategory.rolling,
                target_type=AllocationTargetType.rolling_cycle,
                target_id=rolling.id,
                declared_at=declared_at + timedelta(hours=2),
                source=DeclarationSource.sub_declared,
            )
        else:
            await _add_validated(
                s,
                sub=sub,
                goddess_id=goddess_id,
                method_id=methods[_PAYPAL].id,
                amount=Decimal("640.00"),
                category=PaymentCategory.rolling,
                target_type=AllocationTargetType.rolling_cycle,
                target_id=rolling.id,
                declared_at=declared_at,
                source=DeclarationSource.sub_declared,
            )

    # Photos: 4 uploads, 1 pending
    for idx, d in enumerate(photo_upload_dates(FROZEN_TODAY, 4, base_offset=90)):
        status = SubPhotoStatus.approved if idx < 3 else SubPhotoStatus.pending
        s.add(_photo(sub.id, goddess_id, uploaded_at=_dt(d, time(20, 0)), status=status, idx=idx))

    # Journal: 9 entries
    for spec, d in zip(BEN_JOURNAL_BODIES, ben_journal_dates(FROZEN_TODAY), strict=False):
        s.add(
            _journal(
                sub.id, goddess_id, created_at=_dt(d, time(23, 0)), body=spec.body, mood=spec.mood
            )
        )

    # Kinks: 22 across 5 categories including pet (pup-play)
    kink_assignments: list[tuple[str, KinkRating]] = [
        # bondage
        ("rope", KinkRating.loves),
        ("cuffs", KinkRating.fetish_need),
        ("hogtie", KinkRating.loves),
        ("mummification", KinkRating.curious),
        # impact
        ("spanking", KinkRating.fetish_need),
        ("flogging", KinkRating.loves),
        ("paddle", KinkRating.loves),
        # sensory
        ("blindfolds", KinkRating.loves),
        ("gags", KinkRating.fetish_need),
        ("wax", KinkRating.curious),
        # humiliation
        ("verbal", KinkRating.fetish_need),
        ("inspection", KinkRating.loves),
        ("exposure", KinkRating.loves),
        ("public", KinkRating.curious),
        # service
        ("financial", KinkRating.fetish_need),
        ("foot", KinkRating.loves),
        ("objectification", KinkRating.loves),
        ("domestic", KinkRating.curious),
        # roleplay — pup-play
        ("pet", KinkRating.fetish_need),
        ("slave", KinkRating.loves),
        ("object", KinkRating.curious),
        # psychological
        ("denial", KinkRating.loves),
    ]
    kink_t = _dt(entry.account_created + timedelta(days=7), time(20, 30))
    for slug, rating in kink_assignments:
        if slug in kinks:
            s.add(
                _kink_rating(
                    sub.id, goddess_id, item_id=kinks[slug], rating=rating, created_at=kink_t
                )
            )

    # Limits: 6 (3 hard)
    limits: list[tuple[LimitKind, str, LimitSeverity]] = [
        (LimitKind.hard, "No needle play under any circumstances.", LimitSeverity.high),
        (LimitKind.hard, "No breath play.", LimitSeverity.high),
        (LimitKind.hard, "No permanent physical marks.", LimitSeverity.high),
        (LimitKind.soft, "Fire play only with experienced partner present.", LimitSeverity.medium),
        (
            LimitKind.soft,
            "Electrostimulation requires prior agreement each session.",
            LimitSeverity.medium,
        ),
        (
            LimitKind.soft,
            "No public humiliation in identifiable real-world spaces.",
            LimitSeverity.low,
        ),
    ]
    for kind, body, severity in limits:
        s.add(
            _limit(sub.id, goddess_id, kind=kind, body=body, severity=severity, created_at=kink_t)
        )

    # Rituals: 2
    s.add(
        _ritual(
            sub.id,
            goddess_id,
            title="Daily report",
            frequency=RitualFrequency.daily,
            description="End-of-day written report: what you did, what you felt, what you owe.",
            created_at=_dt(entry.account_created + timedelta(days=10), time(10, 0)),
        )
    )
    s.add(
        _ritual(
            sub.id,
            goddess_id,
            title="Weekly orgasm log",
            frequency=RitualFrequency.weekly,
            description="Full log submitted every Sunday before 23:59.",
            created_at=_dt(entry.account_created + timedelta(days=10), time(10, 5)),
        )
    )


async def _seed_invite_alex(
    s: AsyncSession,
    goddess_id: UUID,
    methods: list[PaymentMethod],
) -> None:
    """Alex: invitation sent 2 days ago (2026-04-15), entry tribute not paid."""
    entry = CAST["sub_invite_alex"]
    sub = _make_sub(goddess_id, entry, status=UserStatus.pending_entry_tribute)
    s.add(sub)
    await s.flush()

    # Invitation that was used by Alex
    inv = Invitation(
        id=uuid4(),
        token="inv-alex-" + sub.id.hex[:12],
        goddess_id=goddess_id,
        entry_tribute_amount=entry.entry_tribute_amount or Decimal("100.00"),
        note="Sent via Twitter — replied to a post about findom.",
        expires_at=frozen_dt(FROZEN_TODAY + timedelta(days=12), time(23, 59)),
        used_at=_dt(date(2026, 4, 15), time(18, 30)),
        used_by_user_id=sub.id,
        created_at=_dt(date(2026, 4, 15), time(10, 0)),
    )
    s.add(inv)

    # Entry tribute not yet paid — nothing more to add for this sub


async def _seed_invite_jordan(
    s: AsyncSession,
    goddess_id: UUID,
) -> None:
    """Jordan: invitation created 3 hours ago; no user account exists yet."""
    entry = CAST["sub_invite_jordan"]
    # Jordan has no User row — the invitation link hasn't been clicked
    inv = Invitation(
        id=uuid4(),
        token="inv-jordan-" + uuid4().hex[:12],
        goddess_id=goddess_id,
        entry_tribute_amount=entry.entry_tribute_amount or Decimal("80.00"),
        note="Jordan — DM'd asking to join, sent invite link.",
        expires_at=frozen_dt(FROZEN_TODAY + timedelta(days=14), time(23, 59)),
        # created ~3 hours before the frozen clock
        created_at=frozen_now(FROZEN_TODAY) - timedelta(hours=3),
    )
    s.add(inv)


async def _seed_eli(
    s: AsyncSession,
    goddess_id: UUID,
    goddess_user_id: UUID,
    methods: list[PaymentMethod],
    kinks: dict[str, UUID],
) -> None:
    """Eli: blacklisted 12 days ago (2026-04-05) for lying about a tribute."""
    entry = CAST["sub_eli"]
    sub = _make_sub(goddess_id, entry, status=UserStatus.blacklisted)
    s.add(sub)
    await s.flush()

    joined_at = _dt(entry.account_created, time(10, 30))
    s.add(_profile(sub.id, joined_at=joined_at, ownership=OwnershipStatus.released))

    # Rolling tribute history (before breach)
    roll_start = entry.account_created + timedelta(days=10)
    rolling = _rolling(
        sub.id,
        goddess_id,
        amount=Decimal("90.00"),
        day=DeadlineDay.fri,
        last_paid_at=_dt(date(2026, 3, 20), time(15, 0)),
        created_at=_dt(roll_start, time(11, 0)),
    )
    s.add(rolling)
    await s.flush()

    # A few payments before breach (months Dec–Mar)
    for d in [date(2025, 12, 12), date(2026, 1, 9), date(2026, 2, 6), date(2026, 3, 6)]:
        await _add_validated(
            s,
            sub=sub,
            goddess_id=goddess_id,
            method_id=methods[_REVOLUT].id,
            amount=Decimal("90.00"),
            category=PaymentCategory.rolling,
            target_type=AllocationTargetType.rolling_cycle,
            target_id=rolling.id,
            declared_at=_dt(d, time(15, 0)),
            source=DeclarationSource.sub_declared,
        )

    # Journal entries (before breach)
    for spec, d in zip(ELI_JOURNAL_BODIES, eli_journal_dates(FROZEN_TODAY), strict=False):
        s.add(
            _journal(
                sub.id, goddess_id, created_at=_dt(d, time(21, 0)), body=spec.body, mood=spec.mood
            )
        )

    # Kinks (frozen at breach time)
    breach_date = date(2026, 4, 5)
    kink_t = _dt(entry.account_created + timedelta(days=14), time(20, 0))
    kink_assignments: list[tuple[str, KinkRating]] = [
        ("verbal", KinkRating.loves),
        ("financial", KinkRating.fetish_need),
        ("foot", KinkRating.curious),
        ("inspection", KinkRating.loves),
        ("denial", KinkRating.loves),
    ]
    for slug, rating in kink_assignments:
        if slug in kinks:
            s.add(
                _kink_rating(
                    sub.id, goddess_id, item_id=kinks[slug], rating=rating, created_at=kink_t
                )
            )

    # Blacklist entry
    breach_dt = _dt(breach_date, time(19, 30))
    s.add(
        BlacklistEntry(
            id=uuid4(),
            goddess_id=goddess_id,
            sub_id=sub.id,
            reason="Lying about a tribute — claimed a transfer was sent when bank confirms no payment received.",
            balance_snapshot=Decimal("0.00"),
            reinstatement_fee_paid=None,
            breached_at=breach_dt,
            forgiven_at=None,
            created_at=breach_dt,
        )
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


async def seed_fake_data() -> None:
    async with SessionMaker() as session:
        if await _existing(session):
            print("seed_fake_data: cast already present — skipping")
            return

        goddess, goddess_user = await _get_goddess(session)
        global _goddess_user_id
        _goddess_user_id = goddess_user.id

        methods = _payment_methods(goddess.id)
        for m in methods:
            session.add(m)
        await session.flush()

        kinks = await _kink_items(session)

        await _seed_chris(session, goddess.id, goddess_user.id, methods, kinks)
        await session.flush()
        await _seed_dan(session, goddess.id, goddess_user.id, methods, kinks)
        await session.flush()
        await _seed_ben(session, goddess.id, goddess_user.id, methods, kinks)
        await session.flush()
        await _seed_invite_alex(session, goddess.id, methods)
        await session.flush()
        await _seed_invite_jordan(session, goddess.id)
        await session.flush()
        await _seed_eli(session, goddess.id, goddess_user.id, methods, kinks)
        await session.flush()

        await session.commit()

    print("seed_fake_data: 6-sub cast + payment methods seeded.")


if __name__ == "__main__":
    import asyncio

    asyncio.run(seed_fake_data())
