"""Shared seed helpers + frozen clock + goddess-id holder.

Profiles import from here; fake_data.py owns orchestration + audit backfill only.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from core.security import hash_password
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
from seeds.cast import FROZEN_TODAY, CastEntry
from seeds.timeline import frozen_dt, frozen_now

SUB_PASSWORD = "ChangeMe!Dev123"

REVOLUT = 0
PAYPAL = 1
IBAN = 2

_goddess_user_id: UUID | None = None


def set_goddess_user_id(user_id: UUID) -> None:
    global _goddess_user_id
    _goddess_user_id = user_id


def gud() -> UUID:
    assert _goddess_user_id is not None, "call set_goddess_user_id() first"
    return _goddess_user_id


def dt_at(d: date, t: time = time(9, 0)) -> datetime:
    return frozen_dt(d, t)


def now() -> datetime:
    return frozen_now(FROZEN_TODAY)


def ago(days: int) -> datetime:
    return now() - timedelta(days=days)


async def get_goddess(session: AsyncSession) -> tuple[Goddess, User]:
    g_result = await session.execute(select(Goddess))
    goddess = g_result.scalars().first()
    if goddess is None:
        raise RuntimeError("Bootstrap goddess missing — run bootstrap before fake_data")
    u_result = await session.execute(
        select(User).where(col(User.email) == goddess.email, col(User.role) == UserRole.goddess)
    )
    user = u_result.scalar_one()
    return goddess, user


def make_sub(
    goddess_id: UUID,
    entry: CastEntry,
    *,
    status: UserStatus | None = None,
) -> User:
    e = entry
    created = dt_at(e.account_created, time(10, 30))
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


def payment_methods(goddess_id: UUID) -> list[PaymentMethod]:
    base = ago(200)
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


def rolling(
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


async def add_validated(
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
    # goddess_recorded payments are entered by the goddess herself, not by the sub —
    # the audit trail should reflect that.
    creator_id = gud() if source == DeclarationSource.goddess_recorded else sub.id
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
        created_by=creator_id,
        declared_at=declared_at,
        validated_at=validated_at,
        validated_by=gud(),
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


def rejected_declaration(
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
        validated_by=gud(),
        rejection_reason=rejection_reason,
        source=DeclarationSource.sub_declared,
    )


def pending_declaration(
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


def contract(
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


def version_from_contract(
    ctr: DebtContract, proposed_by: UUID, round_no: int
) -> DebtContractVersion:
    return DebtContractVersion(
        id=uuid4(),
        contract_id=ctr.id,
        round_no=round_no,
        proposed_by=proposed_by,
        proposed_at=ctr.created_at,
        principal=ctr.principal,
        interest_rate=ctr.interest_rate,
        interest_period=ctr.interest_period,
        duration_periods=ctr.duration_periods,
        payment_frequency=ctr.payment_frequency,
        minimum_payment=ctr.minimum_payment,
        late_penalty_severity=ctr.late_penalty_severity,
        late_penalty_percent=ctr.late_penalty_percent,
        dom_can_add_surprise_penalty=ctr.dom_can_add_surprise_penalty,
        mid_contract_addition_mode=ctr.mid_contract_addition_mode,
        exit_amount=ctr.exit_amount,
    )


def audit(
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


def profile(sub_id: UUID, *, joined_at: datetime, ownership: OwnershipStatus) -> SubProfile:
    return SubProfile(
        user_id=sub_id,
        joined_empire_at=joined_at,
        ownership_status=ownership,
        updated_at=joined_at,
    )


def photo(
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
        reviewed_by=gud() if status != SubPhotoStatus.pending else None,
    )


def journal(
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


def kink_rating(
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


def limit(
    sub_id: UUID,
    goddess_id: UUID,
    *,
    kind: LimitKind,
    body: str,
    severity: LimitSeverity,
    created_at: datetime,
    acknowledged_at: datetime | None = None,
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
        acknowledged_by_goddess_at=acknowledged_at,
    )


def ritual(
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


async def kink_items(session: AsyncSession) -> dict[str, UUID]:
    from models.kink_item import KinkItem

    result = await session.execute(select(KinkItem))
    return {item.slug: item.id for item in result.scalars().all()}


async def existing_cast(session: AsyncSession) -> bool:
    result = await session.execute(select(User).where(col(User.username) == "sub_chris"))
    return result.scalar_one_or_none() is not None
