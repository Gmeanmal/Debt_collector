"""Dan Rhodes — mid-activity sub with one active contract, ~15% repaid.

14 irregular rolling payments (60% sub_declared / 40% goddess_recorded), 2 missed
weeks with late penalties, 1 pending validation, 6 journal entries, 9 kinks, 2
soft limits, 1 weekly Sunday ritual, 4 photos.
"""

from __future__ import annotations

from datetime import date, time, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from models.debt import (
    DebtContractEventType,
    DebtContractStatus,
    LatePenaltySeverity,
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
    pending_declaration,
    photo,
    profile,
    ritual,
    rolling,
    version_from_contract,
)
from seeds.cast import CAST, FROZEN_TODAY
from seeds.content import DAN_JOURNAL_BODIES
from seeds.timeline import (
    contract_signed_dt,
    dan_journal_dates,
    dan_rolling_dates,
    photo_upload_dates,
)
from utils.ledger import replay_events


async def seed_dan(
    s: AsyncSession,
    goddess_id: UUID,
    goddess_user_id: UUID,
    methods: list[PaymentMethod],
    kinks: dict[str, UUID],
) -> None:
    entry = CAST["sub_dan"]
    sub = make_sub(goddess_id, entry)
    s.add(sub)
    await s.flush()

    joined_at = dt_at(entry.account_created, time(10, 30))
    s.add(profile(sub.id, joined_at=joined_at, ownership=OwnershipStatus.in_training))

    roll_dates = dan_rolling_dates(FROZEN_TODAY)
    # Dan's 15th payment keeps the rolling.last_paid_at consistent with an actual
    # validated row (previously the last_paid_at referenced a date with no matching
    # payment declaration).
    extra_date = date(2026, 4, 10)
    roll_dates = [*roll_dates, extra_date]
    last_paid = dt_at(extra_date, time(20, 30))
    roll = rolling(
        sub.id,
        goddess_id,
        amount=Decimal("120.00"),
        day=DeadlineDay.fri,
        last_paid_at=last_paid,
        created_at=dt_at(entry.account_created + timedelta(days=5), time(14, 0)),
    )
    s.add(roll)
    await s.flush()

    for i, d in enumerate(roll_dates):
        declared_at = dt_at(d, time(13, 0))
        source = (
            DeclarationSource.sub_declared if i % 5 != 4 else DeclarationSource.goddess_recorded
        )
        m_idx = PAYPAL if i % 3 != 2 else REVOLUT
        await add_validated(
            s,
            sub=sub,
            goddess_id=goddess_id,
            method_id=methods[m_idx].id,
            amount=Decimal("120.00"),
            category=PaymentCategory.rolling,
            target_type=AllocationTargetType.rolling_cycle,
            target_id=roll.id,
            declared_at=declared_at,
            source=source,
        )

    signed_at = contract_signed_dt(date(2026, 3, 10))
    principal = Decimal("1000.00")
    ctr = contract(
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
    s.add(ctr)
    v0 = version_from_contract(ctr, goddess_user_id, round_no=0)
    s.add(v0)
    await s.flush()
    ctr.current_version_id = v0.id
    s.add_all(
        [
            audit(
                ctr.id,
                goddess_user_id,
                DebtContractEventType.proposed,
                to_status=DebtContractStatus.pending_sub,
                when=signed_at - timedelta(days=3),
            ),
            audit(
                ctr.id,
                sub.id,
                DebtContractEventType.signed,
                from_status=DebtContractStatus.pending_sub,
                to_status=DebtContractStatus.active,
                when=signed_at,
            ),
        ]
    )

    weekly_rate = Decimal("0.080000") * Decimal("12") / Decimal("52")
    events: list[DebtEvent] = []
    pay_start = date(2026, 3, 14)
    for i in range(1, 6):
        pay_date = pay_start + timedelta(weeks=i - 1)
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=ctr.id,
                event_type=EventType.period_interest,
                amount=weekly_rate.quantize(Decimal("0.0001")),
                period_index=i,
                created_at=dt_at(pay_date, time(0, 1)),
            )
        )
    for i in (1, 2, 5):
        pay_date = pay_start + timedelta(weeks=i - 1)
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=ctr.id,
                event_type=EventType.payment_applied,
                amount=Decimal("120.0000"),
                period_index=i,
                created_at=dt_at(pay_date, time(12, 0)),
            )
        )
    for i in (3, 4):
        pay_date = pay_start + timedelta(weeks=i - 1) + timedelta(days=3)
        events.append(
            DebtEvent(
                id=uuid4(),
                contract_id=ctr.id,
                event_type=EventType.late_penalty,
                amount=Decimal("0.1000"),
                period_index=i,
                created_at=dt_at(pay_date, time(2, 0)),
                note="Missed weekly payment — 10% late penalty.",
            )
        )
    # Chronological order matters — multiplicative ops (period_interest, late_penalty)
    # compound on whatever the balance is when they fire, so appending-by-kind would
    # over-compound interest and produce a different balance to what recompute_balance
    # would yield when run later.
    events.sort(key=lambda ev: (ev.created_at, ev.id))
    for ev in events:
        s.add(ev)
        if ev.event_type == EventType.payment_applied:
            await add_validated(
                s,
                sub=sub,
                goddess_id=goddess_id,
                method_id=methods[PAYPAL].id,
                amount=Decimal("120.00"),
                category=PaymentCategory.weekly_debt,
                target_type=AllocationTargetType.contract_debt,
                target_id=ctr.id,
                declared_at=ev.created_at,
                source=DeclarationSource.sub_declared,
            )
    ctr.balance = replay_events(principal, events)

    s.add(
        pending_declaration(
            sub=sub,
            goddess_id=goddess_id,
            method_id=methods[PAYPAL].id,
            amount=Decimal("120.00"),
            category=PaymentCategory.rolling,
            target_id=roll.id,
            declared_at=ago(1),
            source=DeclarationSource.sub_declared,
            note="Weekly rolling — screenshot attached.",
        )
    )

    for idx, d in enumerate(photo_upload_dates(FROZEN_TODAY, 4, base_offset=80)):
        status = SubPhotoStatus.approved if idx < 3 else SubPhotoStatus.pending
        s.add(photo(sub.id, goddess_id, uploaded_at=dt_at(d, time(17, 30)), status=status, idx=idx))

    for spec, d in zip(DAN_JOURNAL_BODIES, dan_journal_dates(FROZEN_TODAY), strict=False):
        s.add(
            journal(
                sub.id, goddess_id, created_at=dt_at(d, time(22, 0)), body=spec.body, mood=spec.mood
            )
        )

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
    kink_t = dt_at(entry.account_created + timedelta(days=10), time(19, 30))
    for slug, rating in kink_assignments:
        if slug in kinks:
            s.add(
                kink_rating(
                    sub.id, goddess_id, item_id=kinks[slug], rating=rating, created_at=kink_t
                )
            )

    for body, severity in [
        ("No content involving third parties without prior consent.", LimitSeverity.medium),
        ("Financial control limited to agreed tribute schedule.", LimitSeverity.low),
    ]:
        s.add(
            limit(
                sub.id,
                goddess_id,
                kind=LimitKind.soft,
                body=body,
                severity=severity,
                created_at=kink_t,
            )
        )

    s.add(
        ritual(
            sub.id,
            goddess_id,
            title="Sunday tribute pic",
            frequency=RitualFrequency.weekly,
            description="Photo proof of tribute sent, every Sunday before 22:00.",
            created_at=dt_at(entry.account_created + timedelta(days=10), time(15, 0)),
        )
    )
