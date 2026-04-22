"""Eli Reeve — blacklisted 12 days ago for lying about a tribute.

Pre-breach history preserved: rolling + payments + journal + kinks. Blacklist
entry stamped 2026-04-05 (12 days before FROZEN_TODAY).
"""

from __future__ import annotations

from datetime import date, time, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from models.blacklist import BlacklistEntry
from models.payment import AllocationTargetType, DeclarationSource, PaymentCategory
from models.payment_method import PaymentMethod
from models.rolling import DeadlineDay
from models.sub_kink_rating import KinkRating
from models.sub_profile import OwnershipStatus
from models.user import UserStatus
from seeds._common import (
    REVOLUT,
    add_validated,
    dt_at,
    journal,
    kink_rating,
    make_sub,
    profile,
    rolling,
)
from seeds.cast import CAST, FROZEN_TODAY
from seeds.content import ELI_JOURNAL_BODIES
from seeds.timeline import eli_journal_dates


async def seed_eli(
    s: AsyncSession,
    goddess_id: UUID,
    goddess_user_id: UUID,
    methods: list[PaymentMethod],
    kinks: dict[str, UUID],
) -> None:
    entry = CAST["sub_eli"]
    sub = make_sub(goddess_id, entry, status=UserStatus.blacklisted)
    s.add(sub)
    await s.flush()

    joined_at = dt_at(entry.account_created, time(10, 30))
    s.add(profile(sub.id, joined_at=joined_at, ownership=OwnershipStatus.released))

    roll_start = entry.account_created + timedelta(days=10)
    roll = rolling(
        sub.id,
        goddess_id,
        amount=Decimal("90.00"),
        day=DeadlineDay.fri,
        last_paid_at=dt_at(date(2026, 3, 20), time(15, 0)),
        created_at=dt_at(roll_start, time(11, 0)),
    )
    s.add(roll)
    await s.flush()

    for d in [date(2025, 12, 12), date(2026, 1, 9), date(2026, 2, 6), date(2026, 3, 6)]:
        await add_validated(
            s,
            sub=sub,
            goddess_id=goddess_id,
            method_id=methods[REVOLUT].id,
            amount=Decimal("90.00"),
            category=PaymentCategory.rolling,
            target_type=AllocationTargetType.rolling_cycle,
            target_id=roll.id,
            declared_at=dt_at(d, time(15, 0)),
            source=DeclarationSource.sub_declared,
        )

    for spec, d in zip(ELI_JOURNAL_BODIES, eli_journal_dates(FROZEN_TODAY), strict=False):
        s.add(
            journal(
                sub.id, goddess_id, created_at=dt_at(d, time(21, 0)), body=spec.body, mood=spec.mood
            )
        )

    breach_date = date(2026, 4, 5)
    kink_t = dt_at(entry.account_created + timedelta(days=14), time(20, 0))
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
                kink_rating(
                    sub.id, goddess_id, item_id=kinks[slug], rating=rating, created_at=kink_t
                )
            )

    breach_dt = dt_at(breach_date, time(19, 30))
    s.add(
        BlacklistEntry(
            id=uuid4(),
            goddess_id=goddess_id,
            sub_id=sub.id,
            reason=(
                "Lying about a tribute — claimed a transfer was sent when bank confirms "
                "no payment received."
            ),
            balance_snapshot=Decimal("0.00"),
            reinstatement_fee_paid=None,
            breached_at=breach_dt,
            forgiven_at=None,
            created_at=breach_dt,
        )
    )
