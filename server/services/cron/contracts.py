"""Daily cron service for contract review reminders.

Single pass, idempotent, driven by APScheduler in Europe/London at 09:00:

- ``run_review_reminders`` — for every active contract whose ``review_at``
  falls in the window [today+14, today+15) Europe/London, creates one
  ``review_reminder`` notification addressed to the goddess, if none exists
  yet for that contract.  Idempotency is enforced by querying
  ``notification`` rows with
  ``type = 'review_reminder' AND payload->>'contract_id' = <id>``.
"""

import datetime
from datetime import UTC
from uuid import UUID
from zoneinfo import ZoneInfo

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.debt import DebtContract, DebtContractStatus
from models.notification import NotificationType
from models.user import User, UserRole
from services.notifications.notify import notify

log = structlog.get_logger()

LONDON = ZoneInfo("Europe/London")


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
        sub_username = sub.username if sub is not None else "unknown"

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
            body=f"Contract {short_id} with {sub_username} reviews on {review_at_formatted}.",
            link=f"/goddess/contracts/{contract_id_str}/preview",
            payload={
                "contract_id": contract_id_str,
                "deep_link": f"/goddess/contracts/{contract_id_str}/preview",
            },
        )
        created += 1

    return created
