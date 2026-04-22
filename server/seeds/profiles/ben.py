"""Ben Whitlock — heavy rolling with two rejected screenshots, currently 7 d late.

8 sub-declared rolling payments (all PayPal, 2 had rejection→resubmit rounds), no
contract, 9 journal entries, 22 kinks across 6 categories, 6 limits (3 hard), 2
rituals (daily report + weekly orgasm log), 4 photos.
"""

from __future__ import annotations

from datetime import time, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

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
    add_validated,
    ago,
    dt_at,
    journal,
    kink_rating,
    limit,
    make_sub,
    photo,
    profile,
    rejected_declaration,
    ritual,
    rolling,
)
from seeds.cast import CAST, FROZEN_TODAY
from seeds.content import BEN_JOURNAL_BODIES, REJECT_REASONS
from seeds.timeline import (
    ben_journal_dates,
    ben_rolling_dates,
    photo_upload_dates,
)


async def seed_ben(
    s: AsyncSession,
    goddess_id: UUID,
    goddess_user_id: UUID,
    methods: list[PaymentMethod],
    kinks: dict[str, UUID],
) -> None:
    entry = CAST["sub_ben"]
    sub = make_sub(goddess_id, entry)
    s.add(sub)
    await s.flush()

    joined_at = dt_at(entry.account_created, time(10, 30))
    s.add(profile(sub.id, joined_at=joined_at, ownership=OwnershipStatus.owned))

    roll_dates = ben_rolling_dates(FROZEN_TODAY)
    last_paid_date = FROZEN_TODAY - timedelta(days=7)
    last_paid = dt_at(last_paid_date, time(14, 0))
    roll = rolling(
        sub.id,
        goddess_id,
        amount=Decimal("640.00"),
        day=DeadlineDay.fri,
        last_paid_at=last_paid,
        created_at=dt_at(entry.account_created + timedelta(days=5), time(9, 0)),
        notes="Heavy rolling. Has a history of 2-3 week gaps.",
    )
    s.add(roll)
    await s.flush()

    for i, d in enumerate(roll_dates):
        declared_at = dt_at(d, time(14, 0))
        if i in (2, 6):
            reason = (
                REJECT_REASONS[0]
                if i == 2
                else "Photo blurred — please retake the screenshot at full brightness and resubmit."
            )
            s.add(
                rejected_declaration(
                    sub=sub,
                    goddess_id=goddess_id,
                    method_id=methods[PAYPAL].id,
                    amount=Decimal("640.00"),
                    category=PaymentCategory.rolling,
                    target_id=roll.id,
                    declared_at=declared_at,
                    rejection_reason=reason,
                )
            )
            await add_validated(
                s,
                sub=sub,
                goddess_id=goddess_id,
                method_id=methods[PAYPAL].id,
                amount=Decimal("640.00"),
                category=PaymentCategory.rolling,
                target_type=AllocationTargetType.rolling_cycle,
                target_id=roll.id,
                declared_at=declared_at + timedelta(hours=2),
                source=DeclarationSource.sub_declared,
            )
        else:
            await add_validated(
                s,
                sub=sub,
                goddess_id=goddess_id,
                method_id=methods[PAYPAL].id,
                amount=Decimal("640.00"),
                category=PaymentCategory.rolling,
                target_type=AllocationTargetType.rolling_cycle,
                target_id=roll.id,
                declared_at=declared_at,
                source=DeclarationSource.sub_declared,
            )

    for idx, d in enumerate(photo_upload_dates(FROZEN_TODAY, 4, base_offset=90)):
        status = SubPhotoStatus.approved if idx < 3 else SubPhotoStatus.pending
        s.add(photo(sub.id, goddess_id, uploaded_at=dt_at(d, time(20, 0)), status=status, idx=idx))

    for spec, d in zip(BEN_JOURNAL_BODIES, ben_journal_dates(FROZEN_TODAY), strict=False):
        s.add(
            journal(
                sub.id, goddess_id, created_at=dt_at(d, time(23, 0)), body=spec.body, mood=spec.mood
            )
        )

    kink_assignments: list[tuple[str, KinkRating]] = [
        ("rope", KinkRating.loves),
        ("cuffs", KinkRating.fetish_need),
        ("hogtie", KinkRating.loves),
        ("mummification", KinkRating.curious),
        ("spanking", KinkRating.fetish_need),
        ("flogging", KinkRating.loves),
        ("paddle", KinkRating.loves),
        ("blindfolds", KinkRating.loves),
        ("gags", KinkRating.fetish_need),
        ("wax", KinkRating.curious),
        ("verbal", KinkRating.fetish_need),
        ("inspection", KinkRating.loves),
        ("exposure", KinkRating.loves),
        ("public", KinkRating.curious),
        ("financial", KinkRating.fetish_need),
        ("foot", KinkRating.loves),
        ("objectification", KinkRating.loves),
        ("domestic", KinkRating.curious),
        ("pet", KinkRating.fetish_need),
        ("slave", KinkRating.loves),
        ("object", KinkRating.curious),
        ("denial", KinkRating.loves),
    ]
    kink_t = dt_at(entry.account_created + timedelta(days=7), time(20, 30))
    for slug, rating in kink_assignments:
        if slug in kinks:
            s.add(
                kink_rating(
                    sub.id, goddess_id, item_id=kinks[slug], rating=rating, created_at=kink_t
                )
            )

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
    for idx, (kind, body, severity) in enumerate(limits):
        ack = ago(10) if idx == 1 else (ago(2) if idx == 3 else None)
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
            title="Daily report",
            frequency=RitualFrequency.daily,
            description="End-of-day written report: what you did, what you felt, what you owe.",
            created_at=dt_at(entry.account_created + timedelta(days=10), time(10, 0)),
        )
    )
    s.add(
        ritual(
            sub.id,
            goddess_id,
            title="Weekly orgasm log",
            frequency=RitualFrequency.weekly,
            description="Full log submitted every Sunday before 23:59.",
            created_at=dt_at(entry.account_created + timedelta(days=10), time(10, 5)),
        )
    )
