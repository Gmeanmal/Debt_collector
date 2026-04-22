"""Invited-but-not-active subs: Alex (porch) and Jordan (link unused).

Alex: invitation used 2 days ago, entry tribute not paid → porch state.
Jordan: invitation created 3 hours ago, no user account yet.
"""

from __future__ import annotations

from datetime import date, time, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from models.invitation import Invitation
from models.payment_method import PaymentMethod
from models.sub_profile import OwnershipStatus
from models.user import UserStatus
from seeds._common import dt_at, make_sub, profile
from seeds.cast import CAST, FROZEN_TODAY
from seeds.timeline import frozen_dt, frozen_now


async def seed_invite_alex(
    s: AsyncSession,
    goddess_id: UUID,
    methods: list[PaymentMethod],
) -> None:
    """Alex: invitation sent 2 days ago (2026-04-15), entry tribute not paid."""
    entry = CAST["sub_invite_alex"]
    sub = make_sub(goddess_id, entry, status=UserStatus.pending_entry_tribute)
    s.add(sub)
    await s.flush()

    # Minimal sub_profile so /auth/me resolves before the porch gate fires.
    joined_at = dt_at(entry.account_created, time(18, 30))
    s.add(profile(sub.id, joined_at=joined_at, ownership=OwnershipStatus.free))

    inv = Invitation(
        id=uuid4(),
        token="inv-alex-" + sub.id.hex[:12],
        goddess_id=goddess_id,
        entry_tribute_amount=entry.entry_tribute_amount or Decimal("100.00"),
        note="Sent via Twitter — replied to a post about findom.",
        expires_at=frozen_dt(FROZEN_TODAY + timedelta(days=12), time(23, 59)),
        used_at=dt_at(date(2026, 4, 15), time(18, 30)),
        used_by_user_id=sub.id,
        created_at=dt_at(date(2026, 4, 15), time(10, 0)),
    )
    s.add(inv)


async def seed_invite_jordan(
    s: AsyncSession,
    goddess_id: UUID,
) -> None:
    """Jordan: invitation created 3 hours ago; no user account exists yet."""
    entry = CAST["sub_invite_jordan"]
    inv = Invitation(
        id=uuid4(),
        token="inv-jordan-" + uuid4().hex[:12],
        goddess_id=goddess_id,
        entry_tribute_amount=entry.entry_tribute_amount or Decimal("80.00"),
        note="Jordan — DM'd asking to join, sent invite link.",
        expires_at=frozen_dt(FROZEN_TODAY + timedelta(days=14), time(23, 59)),
        created_at=frozen_now(FROZEN_TODAY) - timedelta(hours=3),
    )
    s.add(inv)
