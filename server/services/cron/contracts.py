"""Daily cron service for contract review reminders and auto-extend renewals.

Single pass, idempotent, driven by APScheduler in Europe/London at 09:00:

- ``run_review_reminders`` — for every active contract whose ``review_at``
  falls in the window [today+14, today+15) Europe/London, creates one
  ``review_reminder`` notification addressed to the goddess, if none exists
  yet for that contract.  Idempotency is enforced by querying
  ``notification`` rows with
  ``type = 'review_reminder' AND payload->>'contract_id' = <id>``.

- ``run_auto_extend_renewals`` — for every active contract with
  ``renewal_policy='auto_extend'`` whose ``review_at <= now_utc``, clones
  it into a new ``pending_sub_signature`` contract with an advanced
  ``review_at``.  Idempotency is enforced by checking for an existing
  ``debt_contract_audit`` row with
  ``event_type='contract_renewed' AND note`` containing the old contract id.
"""

import datetime
from datetime import UTC
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

import structlog
from dateutil.relativedelta import relativedelta
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.debt import (
    DebtContract,
    DebtContractAudit,
    DebtContractEventType,
    DebtContractStatus,
    DebtContractVersion,
    PaymentFrequency,
    RenewalPolicy,
)
from models.notification import NotificationType
from models.user import User, UserRole
from services.notifications.notify import notify

log = structlog.get_logger()

LONDON = ZoneInfo("Europe/London")


def _sub_label(user: User) -> str:
    first = (user.first_name or "").strip()
    last = (user.last_name or "").strip()
    full = f"{first} {last}".strip()
    if full:
        return f"{full} (@{user.username})"
    return f"@{user.username}"


def _review_window_utc(
    today_london: datetime.date,
) -> tuple[datetime.datetime, datetime.datetime]:
    """Return [start_utc, end_utc) for contracts reviewing exactly 14 days from today.

    Both boundaries are naive UTC datetimes, matching the storage convention
    used by ``debt_contract.review_at``.
    """
    target_london = today_london + datetime.timedelta(days=14)
    next_london = target_london + datetime.timedelta(days=1)

    start_utc = (
        datetime.datetime(
            target_london.year,
            target_london.month,
            target_london.day,
            tzinfo=LONDON,
        )
        .astimezone(UTC)
        .replace(tzinfo=None)
    )
    end_utc = (
        datetime.datetime(
            next_london.year,
            next_london.month,
            next_london.day,
            tzinfo=LONDON,
        )
        .astimezone(UTC)
        .replace(tzinfo=None)
    )
    return start_utc, end_utc


async def _goddess_user_for_contract(session: AsyncSession, contract: DebtContract) -> User | None:
    """Return the ``User`` row of the goddess who owns this contract, or None."""
    result = await session.execute(
        select(User).where(
            col(User.goddess_id) == contract.goddess_id,
            col(User.role) == UserRole.goddess,
        )
    )
    return result.scalar_one_or_none()


async def _reminder_already_sent(session: AsyncSession, contract_id: str) -> bool:
    """Check whether a review_reminder notification already exists for this contract.

    ``notification.payload`` is JSONB, so the ``->>`` operator works directly
    without casting.
    """
    result = await session.execute(
        text(
            "SELECT 1 FROM notification "
            "WHERE type = 'review_reminder' "
            "AND payload->>'contract_id' = :contract_id "
            "LIMIT 1"
        ),
        {"contract_id": contract_id},
    )
    return result.first() is not None


async def run_review_reminders(session: AsyncSession) -> int:
    """Create review_reminder notifications for contracts due in 14 days.

    Returns the number of notifications created.  Re-running on the same day
    is a no-op: the idempotency check skips any contract that already has a
    ``review_reminder`` notification.
    """
    today_london = datetime.datetime.now(UTC).astimezone(LONDON).date()
    start_utc, end_utc = _review_window_utc(today_london)

    result = await session.execute(
        select(DebtContract).where(
            col(DebtContract.status) == DebtContractStatus.active,
            col(DebtContract.review_at) >= start_utc,
            col(DebtContract.review_at) < end_utc,
        )
    )
    contracts = list(result.scalars().all())

    created = 0
    for contract in contracts:
        contract_id_str = str(contract.id)

        if await _reminder_already_sent(session, contract_id_str):
            continue

        goddess_user = await _goddess_user_for_contract(session, contract)
        if goddess_user is None:
            log.warning("review_reminder_no_goddess_user", contract_id=contract_id_str)
            continue

        sub_result = await session.execute(select(User).where(col(User.id) == contract.sub_id))
        sub = sub_result.scalar_one_or_none()
        sub_label = _sub_label(sub) if sub is not None else "unknown"

        # review_at is filtered non-null by the WHERE clause above
        if contract.review_at is None:
            continue
        review_at_london = contract.review_at.replace(tzinfo=UTC).astimezone(LONDON)
        review_at_formatted = review_at_london.strftime("%d %b %Y")

        short_id = contract_id_str[:8]

        await notify(
            session,
            UUID(str(goddess_user.id)),
            NotificationType.review_reminder,
            title="Contract review coming up",
            body=f"Contract {short_id} with {sub_label} reviews on {review_at_formatted}.",
            link=f"/goddess/contracts/{contract_id_str}/preview",
            payload={
                "contract_id": contract_id_str,
                "deep_link": f"/goddess/contracts/{contract_id_str}/preview",
            },
        )
        created += 1

    return created


def _advance_review_at(
    old_review_at: datetime.datetime,
    payment_frequency: PaymentFrequency,
    duration_periods: int,
) -> datetime.datetime:
    """Return the new review_at by advancing old_review_at by one contract duration.

    Duration = duration_periods × one_period:
      weekly   → 7 days per period
      biweekly → 14 days per period
      monthly  → 1 calendar month per period (dateutil.relativedelta)
    """
    if payment_frequency == PaymentFrequency.weekly:
        delta = datetime.timedelta(days=7 * duration_periods)
        return old_review_at + delta
    if payment_frequency == PaymentFrequency.biweekly:
        delta = datetime.timedelta(days=14 * duration_periods)
        return old_review_at + delta
    # monthly
    return old_review_at + relativedelta(months=duration_periods)


async def _already_cloned(session: AsyncSession, source_contract_id: str) -> bool:
    """Return True if a contract_renewed audit row for this source already exists.

    The note field stores the source contract id prefixed with 'source_contract_id:'
    so it is uniquely queryable without adding a new column.
    """
    result = await session.execute(
        text(
            "SELECT 1 FROM debt_contract_audit "
            "WHERE event_type = 'contract_renewed' "
            "AND note = :note "
            "LIMIT 1"
        ),
        {"note": f"source_contract_id:{source_contract_id}"},
    )
    return result.first() is not None


async def _clone_contract(
    session: AsyncSession,
    source: DebtContract,
    goddess_user_id: UUID,
) -> DebtContract:
    """Create a new pending_sub_signature contract cloned from source.

    Copies all financial fields and clauses; assigns a fresh id, clears
    signature fields, and advances review_at by one contract duration.
    """
    assert source.review_at is not None

    new_review_at = _advance_review_at(
        source.review_at, source.payment_frequency, source.duration_periods
    )
    now = datetime.datetime.now(UTC).replace(tzinfo=None)

    clone = DebtContract(
        id=uuid4(),
        sub_id=source.sub_id,
        goddess_id=source.goddess_id,
        sub_initiated=False,
        principal=source.principal,
        interest_rate=source.interest_rate,
        interest_period=source.interest_period,
        duration_periods=source.duration_periods,
        payment_frequency=source.payment_frequency,
        minimum_payment=source.minimum_payment,
        late_penalty_severity=source.late_penalty_severity,
        late_penalty_percent=source.late_penalty_percent,
        dom_can_add_surprise_penalty=source.dom_can_add_surprise_penalty,
        mid_contract_addition_mode=source.mid_contract_addition_mode,
        exit_amount=source.exit_amount,
        clauses_json=list(source.clauses_json),
        renewal_policy=source.renewal_policy,
        status=DebtContractStatus.pending_sub_signature,
        balance=source.principal,
        signature_b64=None,
        signed_at=None,
        review_at=new_review_at,
        created_at=now,
        updated_at=now,
    )
    session.add(clone)
    await session.flush()

    version = DebtContractVersion(
        id=uuid4(),
        contract_id=clone.id,
        round_no=0,
        proposed_by=goddess_user_id,
        principal=source.principal,
        interest_rate=source.interest_rate,
        interest_period=source.interest_period,
        duration_periods=source.duration_periods,
        payment_frequency=source.payment_frequency,
        minimum_payment=source.minimum_payment,
        late_penalty_severity=source.late_penalty_severity,
        late_penalty_percent=source.late_penalty_percent,
        dom_can_add_surprise_penalty=source.dom_can_add_surprise_penalty,
        mid_contract_addition_mode=source.mid_contract_addition_mode,
        exit_amount=source.exit_amount,
    )
    session.add(version)
    await session.flush()

    clone.current_version_id = version.id
    clone.updated_at = datetime.datetime.now(UTC).replace(tzinfo=None)
    session.add(clone)
    await session.flush()

    audit = DebtContractAudit(
        id=uuid4(),
        contract_id=clone.id,
        event_type=DebtContractEventType.contract_renewed,
        actor_id=goddess_user_id,
        from_status=None,
        to_status=DebtContractStatus.pending_sub_signature,
        # Source contract id stored in note for idempotency queries.
        note=f"source_contract_id:{source.id}",
    )
    session.add(audit)
    await session.flush()

    return clone


async def run_auto_extend_renewals(session: AsyncSession) -> int:
    """Clone active auto_extend contracts whose review_at has passed into pending_sub_signature.

    Returns the count of contracts cloned.  Re-running is safe: idempotency is
    enforced by checking for an existing ``contract_renewed`` audit row whose
    ``note`` matches the source contract id.
    """
    now_utc = datetime.datetime.now(UTC).replace(tzinfo=None)

    result = await session.execute(
        select(DebtContract).where(
            col(DebtContract.status) == DebtContractStatus.active,
            col(DebtContract.renewal_policy) == RenewalPolicy.auto_extend,
            col(DebtContract.review_at) <= now_utc,
            col(DebtContract.review_at).is_not(None),
        )
    )
    contracts = list(result.scalars().all())

    cloned = 0
    for contract in contracts:
        contract_id_str = str(contract.id)

        if await _already_cloned(session, contract_id_str):
            log.debug("auto_extend_skip_already_cloned", contract_id=contract_id_str)
            continue

        goddess_user = await _goddess_user_for_contract(session, contract)
        if goddess_user is None:
            log.warning("auto_extend_no_goddess_user", contract_id=contract_id_str)
            continue

        clone = await _clone_contract(session, contract, UUID(str(goddess_user.id)))
        clone_id_str = str(clone.id)

        await notify(
            session,
            contract.sub_id,
            NotificationType.contract_renewed,
            title="Contract renewed",
            body="Your contract has been automatically renewed. Please sign to activate it.",
            link=f"/sub/contracts/{clone_id_str}",
            payload={
                "contract_id": clone_id_str,
                "deep_link": f"/sub/contracts/{clone_id_str}",
            },
        )

        log.info(
            "auto_extend_cloned",
            source_contract_id=contract_id_str,
            new_contract_id=clone_id_str,
        )
        cloned += 1

    return cloned
