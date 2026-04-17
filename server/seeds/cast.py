"""Frozen cast for the dev seed.

Six subs around a frozen clock. Never import datetime.now() here — all dates
are anchored to FROZEN_TODAY.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from models.user import AvatarKey, UserStatus

FROZEN_TODAY: date = date(2026, 4, 17)


@dataclass(frozen=True)
class CastEntry:
    username: str
    first_name: str
    last_name: str
    status: UserStatus
    avatar_key: AvatarKey
    account_created: date
    payment_handle: str | None = None
    twitter_handle: str | None = None
    source_note: str | None = None
    rolling_amount: Decimal | None = None
    entry_tribute_amount: Decimal | None = None


CAST: dict[str, CastEntry] = {
    "sub_chris": CastEntry(
        username="sub_chris",
        first_name="Chris",
        last_name="Doyle",
        status=UserStatus.active,
        avatar_key=AvatarKey.dark_1,
        account_created=date(2025, 9, 22),
        payment_handle="chrisdoyle",
        twitter_handle="@chrisdoyle",
        source_note="Recruited via Twitter DM, September 2025.",
        rolling_amount=Decimal("80.00"),
    ),
    "sub_dan": CastEntry(
        username="sub_dan",
        first_name="Dan",
        last_name="Rhodes",
        status=UserStatus.active,
        avatar_key=AvatarKey.dark_2,
        account_created=date(2025, 11, 3),
        payment_handle="danrhodes",
        twitter_handle="@danrhodes",
        source_note="Found via Findom Twitter community.",
        rolling_amount=Decimal("120.00"),
    ),
    "sub_ben": CastEntry(
        username="sub_ben",
        first_name="Ben",
        last_name="Whitlock",
        status=UserStatus.active,
        avatar_key=AvatarKey.pink_2,
        account_created=date(2025, 10, 14),
        payment_handle="benwhitlock",
        twitter_handle="@benwhitlock",
        source_note="Self-referred, heavy tribute history.",
        rolling_amount=Decimal("640.00"),
    ),
    "sub_invite_alex": CastEntry(
        username="sub_invite_alex",
        first_name="Alex",
        last_name="Morgan",
        status=UserStatus.pending_entry_tribute,
        avatar_key=AvatarKey.pink_1,
        account_created=date(2026, 4, 15),
        entry_tribute_amount=Decimal("100.00"),
    ),
    "sub_invite_jordan": CastEntry(
        username="sub_invite_jordan",
        first_name="Jordan",
        last_name="Kerr",
        status=UserStatus.active,  # placeholder — Jordan has no User row yet
        avatar_key=AvatarKey.accent_1,
        account_created=date(2026, 4, 17),
        entry_tribute_amount=Decimal("80.00"),
    ),
    "sub_eli": CastEntry(
        username="sub_eli",
        first_name="Eli",
        last_name="Reeve",
        status=UserStatus.blacklisted,
        avatar_key=AvatarKey.dark_3,
        account_created=date(2025, 12, 1),
        payment_handle="elireeve",
        source_note="Was active; blacklisted for dishonesty.",
        rolling_amount=Decimal("90.00"),
    ),
}
