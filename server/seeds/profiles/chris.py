"""Chris Doyle — perfect-model sub.

22 weekly rolling payments (Revolut/PayPal/IBAN interleaved with 3 goddess-recorded
bonus tributes), one closed contract, one active contract ~66% repaid, 18 kinks,
4 limits, 1 daily ritual, 5 approved photos, 12 journal entries.
"""

from __future__ import annotations

from datetime import date, time, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from models.adjustment import AdjustmentStatus, ContractAdjustment
from models.debt import (
    DebtContractEventType,
    DebtContractStatus,
    PaymentFrequency,
)
from models.debt_event import DebtEvent, EventType
from models.payment import AllocationTargetType, DeclarationSource, PaymentCategory
from models.payment_method import PaymentMethod
from models.ritual import RitualFrequency
from models.rolling import DeadlineDay
from models.sub_kink_rating import KinkRating
from models.sub_limit import LimitKind, LimitSeverity
from models.sub_photo import SubPhotoStatus
from models.sub_profile import OwnershipStatus
from seeds._common import (
    IBAN,
    PAYPAL,
    REVOLUT,
    add_validated,
    ago,
    audit,
    contract,
    dt_at,
    journal,
    kink_rating,
    limit,
    make_sub,
    photo,
    profile,
    ritual,
    rolling,
    version_from_contract,
)
from seeds.cast import CAST, FROZEN_TODAY
from seeds.content import CHRIS_JOURNAL_BODIES
from seeds.timeline import (
    chris_journal_dates,
    chris_rolling_dates,
    contract_closed_dt,
    contract_signed_dt,
    photo_upload_dates,
)
from utils.ledger import replay_events


async def seed_chris(
    s: AsyncSession,
    goddess_id: UUID,
    goddess_user_id: UUID,
    methods: list[PaymentMethod],
    kinks: dict[str, UUID],
) -> None:
    entry = CAST["sub_chris"]
    sub = make_sub(goddess_id, entry)
    s.add(sub)
    await s.flush()

    joined_at = dt_at(entry.account_created, time(10, 30))
    s.add(profile(sub.id, joined_at=joined_at, ownership=OwnershipStatus.collared))

    roll_dates = chris_rolling_dates(FROZEN_TODAY)
    last_paid = dt_at(roll_dates[-1], time(20, 30))
    roll = rolling(
        sub.id,
        goddess_id,
        amount=Decimal("80.00"),
        day=DeadlineDay.mon,
        last_paid_at=last_paid,
        created_at=dt_at(entry.account_created + timedelta(days=7), time(11, 0)),
    )
    s.add(roll)
    await s.flush()

    # 22 weekly payments: alternating Revolut (10), PayPal (7), IBAN (5)
    interleaved = [
        REVOLUT,
        REVOLUT,
        PAYPAL,
        REVOLUT,
        REVOLUT,
        PAYPAL,
        REVOLUT,
        PAYPAL,
        REVOLUT,
        PAYPAL,
        REVOLUT,
        IBAN,
        REVOLUT,
        REVOLUT,
        IBAN,
        REVOLUT,
        PAYPAL,
        REVOLUT,
        IBAN,
        REVOLUT,
        REVOLUT,
        IBAN,
    ]
    assert len(interleaved) == 22  # noqa: S101
    for i, (d, m_idx) in enumerate(zip(roll_dates, interleaved, strict=True)):
        declared_at = dt_at(d, time(8, 45))
        source = DeclarationSource.sub_declared
        if i in (4, 11, 18):
            bonus = Decimal("100.00") if i != 18 else Decimal("150.00")
            await add_validated(
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
            await add_validated(
                s,
                sub=sub,
                goddess_id=goddess_id,
                method_id=methods[m_idx].id,
                amount=Decimal("80.00"),
                category=PaymentCategory.rolling,
                target_type=AllocationTargetType.rolling_cycle,
                target_id=roll.id,
                declared_at=declared_at,
                source=source,
            )

    # Closed contract: signed 2025-11-02, closed 2026-02-15
    closed_signed = contract_signed_dt(date(2025, 11, 2))
    closed_contract = contract(
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
    cv0 = version_from_contract(closed_contract, goddess_user_id, round_no=0)
    s.add(cv0)
    await s.flush()
    closed_contract.current_version_id = cv0.id
    closed_at = contract_closed_dt(date(2026, 2, 15))
    s.add_all(
        [
            audit(
                closed_contract.id,
                goddess_user_id,
                DebtContractEventType.proposed,
                to_status=DebtContractStatus.pending_sub,
                when=closed_signed - timedelta(days=2),
            ),
            audit(
                closed_contract.id,
                sub.id,
                DebtContractEventType.signed,
                from_status=DebtContractStatus.pending_sub,
                to_status=DebtContractStatus.active,
                when=closed_signed,
            ),
            audit(
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

    # Active contract: signed 2026-02-20, ~70% repaid after 8 × £100 weekly payments.
    active_signed = contract_signed_dt(date(2026, 2, 20))
    active_principal = Decimal("1100.00")
    active_contract = contract(
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
    av0 = version_from_contract(active_contract, goddess_user_id, round_no=0)
    s.add(av0)
    await s.flush()
    active_contract.current_version_id = av0.id
    s.add_all(
        [
            audit(
                active_contract.id,
                goddess_user_id,
                DebtContractEventType.proposed,
                to_status=DebtContractStatus.pending_sub,
                when=active_signed - timedelta(days=3),
            ),
            audit(
                active_contract.id,
                sub.id,
                DebtContractEventType.signed,
                from_status=DebtContractStatus.pending_sub,
                to_status=DebtContractStatus.active,
                when=active_signed,
            ),
        ]
    )

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
                created_at=dt_at(pay_date, time(0, 1)),
            )
        )
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=active_contract.id,
                event_type=EventType.payment_applied,
                amount=Decimal("100.0000"),
                period_index=i,
                created_at=dt_at(pay_date, time(9, 30)),
            )
        )
    for ev in events:
        s.add(ev)
        if ev.event_type == EventType.payment_applied:
            m_idx = (
                interleaved[ev.period_index - 1]
                if ev.period_index and ev.period_index <= 8
                else REVOLUT
            )
            await add_validated(
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

    s.add(
        ContractAdjustment(
            id=uuid4(),
            contract_id=active_contract.id,
            proposed_by=goddess_user_id,
            amount=Decimal("50.00"),
            reason="Penalty waiver from week 3 — formalising the agreed exception.",
            status=AdjustmentStatus.pending_sub_approval,
            created_at=ago(3),
            updated_at=ago(3),
        )
    )

    for idx, d in enumerate(photo_upload_dates(FROZEN_TODAY, 5, base_offset=120)):
        s.add(
            photo(
                sub.id,
                goddess_id,
                uploaded_at=dt_at(d, time(18, 0)),
                status=SubPhotoStatus.approved,
                idx=idx,
            )
        )

    for spec, d in zip(CHRIS_JOURNAL_BODIES, chris_journal_dates(FROZEN_TODAY), strict=False):
        s.add(
            journal(
                sub.id,
                goddess_id,
                created_at=dt_at(d, time(21, 15)),
                body=spec.body,
                mood=spec.mood,
            )
        )

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
    kink_t = dt_at(entry.account_created + timedelta(days=14), time(20, 0))
    for slug, rating in kink_assignments:
        if slug in kinks:
            s.add(
                kink_rating(
                    sub.id, goddess_id, item_id=kinks[slug], rating=rating, created_at=kink_t
                )
            )

    chris_limits: list[tuple[LimitKind, str, LimitSeverity]] = [
        (LimitKind.hard, "No blood play of any kind.", LimitSeverity.high),
        (LimitKind.hard, "No permanent marks or scarring.", LimitSeverity.high),
        (LimitKind.soft, "Suspension bondage only with prior discussion.", LimitSeverity.medium),
        (LimitKind.soft, "Public humiliation limited to online contexts.", LimitSeverity.low),
    ]
    for idx, (kind, body, severity) in enumerate(chris_limits):
        ack = ago(5) if idx == 0 else None
        s.add(
            limit(
                sub.id,
                goddess_id,
                kind=kind,
                body=body,
                severity=severity,
                created_at=kink_t,
                acknowledged_at=ack,
            )
        )

    s.add(
        ritual(
            sub.id,
            goddess_id,
            title="Morning collar selfie",
            frequency=RitualFrequency.daily,
            description="Photo of collar before 9am, sent to the app.",
            created_at=dt_at(entry.account_created + timedelta(days=14), time(11, 0)),
        )
    )
