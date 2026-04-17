from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from daos.allocation_dao import ContractPaymentStats
from models.adjustment import ContractAdjustment
from models.debt import DebtContract, DebtContractVersion
from models.user import User
from schemas.adjustment import ContractAdjustmentOut
from schemas.debt import (
    ContractClauseOut,
    DebtContractCounter,
    DebtContractOut,
    DebtContractVersionOut,
)
from utils.periods import current_period_index

_PENDING_STATUSES_SET = None  # imported where needed to avoid circular

_ZERO = Decimal("0")
_HUNDRED = Decimal("100")
_TWO_DP = Decimal("0.01")


def now_utc() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def user_display_name(user: User) -> str:
    first = (user.first_name or "").strip()
    last = (user.last_name or "").strip()
    full = f"{first} {last}".strip()
    if full:
        return full
    if user.username:
        return user.username
    return user.email


def sub_notification_label(user: User) -> str:
    """Return ``Full Name (@username)`` for notification bodies, or ``@username`` if no name set."""
    first = (user.first_name or "").strip()
    last = (user.last_name or "").strip()
    full = f"{first} {last}".strip()
    if full:
        return f"{full} (@{user.username})"
    return f"@{user.username}"


def clauses_out(contract: DebtContract) -> list[ContractClauseOut]:
    """Parse the stored ``clauses_json`` blob into ordered ``ContractClauseOut`` models."""
    raw = contract.clauses_json or []
    parsed: list[ContractClauseOut] = []
    for entry in raw:
        raw_id = entry.get("id")
        raw_label = entry.get("label")
        raw_body = entry.get("body")
        raw_sort = entry.get("sort_order")
        if not isinstance(raw_id, str) or not isinstance(raw_label, str):
            continue
        if not isinstance(raw_body, str) or not isinstance(raw_sort, int):
            continue
        try:
            clause_id = UUID(raw_id)
        except ValueError:
            continue
        parsed.append(
            ContractClauseOut(
                id=clause_id,
                label=raw_label,
                body=raw_body,
                sort_order=raw_sort,
            )
        )
    parsed.sort(key=lambda c: c.sort_order)
    return parsed


def version_out(version: DebtContractVersion) -> DebtContractVersionOut:
    return DebtContractVersionOut(
        id=version.id,
        contract_id=version.contract_id,
        round_no=version.round_no,
        proposed_by=version.proposed_by,
        proposed_at=version.proposed_at,
        principal=Decimal(str(version.principal)),
        interest_rate=Decimal(str(version.interest_rate)),
        interest_period=version.interest_period,
        duration_periods=version.duration_periods,
        payment_frequency=version.payment_frequency,
        minimum_payment=Decimal(str(version.minimum_payment)),
        late_penalty_severity=version.late_penalty_severity,
        late_penalty_percent=Decimal(str(version.late_penalty_percent)),
        dom_can_add_surprise_penalty=version.dom_can_add_surprise_penalty,
        mid_contract_addition_mode=version.mid_contract_addition_mode,
        exit_amount=Decimal(str(version.exit_amount)),
    )


def compute_payment_stats(
    contract: DebtContract,
    stats: ContractPaymentStats,
) -> tuple[Decimal, Decimal, Decimal, float, bool]:
    """Return (total_paid, total_due, remaining, progress_pct, on_track)."""
    total_paid = stats.total_paid
    minimum_payment = Decimal(str(contract.minimum_payment))
    total_due = (minimum_payment * Decimal(contract.duration_periods)).quantize(_TWO_DP)
    remaining = max(_ZERO, total_due - total_paid).quantize(_TWO_DP)
    if total_due > _ZERO:
        raw_pct = float((total_paid / total_due * _HUNDRED).quantize(Decimal("0.1")))
        progress_pct = min(100.0, max(0.0, raw_pct))
    else:
        progress_pct = 100.0
    elapsed = current_period_index(contract, now_utc())
    expected = (minimum_payment * Decimal(elapsed)).quantize(_TWO_DP)
    on_track = contract.signed_at is None or total_paid >= expected
    return total_paid, total_due, remaining, progress_pct, on_track


def contract_out(
    contract: DebtContract,
    current_version: DebtContractVersion | None,
    stats: ContractPaymentStats,
) -> DebtContractOut:
    ver_out = version_out(current_version) if current_version is not None else None
    total_paid, total_due, remaining, progress_pct, on_track = compute_payment_stats(
        contract, stats
    )
    return DebtContractOut(
        id=contract.id,
        slug=contract.slug,
        sub_id=contract.sub_id,
        goddess_id=contract.goddess_id,
        sub_initiated=contract.sub_initiated,
        principal=Decimal(str(contract.principal)),
        interest_rate=Decimal(str(contract.interest_rate)),
        interest_period=contract.interest_period,
        duration_periods=contract.duration_periods,
        payment_frequency=contract.payment_frequency,
        minimum_payment=Decimal(str(contract.minimum_payment)),
        late_penalty_severity=contract.late_penalty_severity,
        late_penalty_percent=Decimal(str(contract.late_penalty_percent)),
        dom_can_add_surprise_penalty=contract.dom_can_add_surprise_penalty,
        mid_contract_addition_mode=contract.mid_contract_addition_mode,
        exit_amount=Decimal(str(contract.exit_amount)),
        status=contract.status,
        current_version=ver_out,
        signed_at=contract.signed_at,
        balance=Decimal(str(contract.balance)),
        created_at=contract.created_at,
        updated_at=contract.updated_at,
        total_paid=total_paid,
        total_due=total_due,
        remaining=remaining,
        progress_pct=progress_pct,
        payment_count=stats.payment_count,
        last_payment_at=stats.last_payment_at,
        first_payment_at=stats.first_payment_at,
        on_track=on_track,
        clauses=clauses_out(contract),
    )


def apply_payload_to_contract(contract: DebtContract, payload: DebtContractCounter) -> None:
    contract.principal = payload.principal
    contract.interest_rate = payload.interest_rate
    contract.interest_period = payload.interest_period
    contract.duration_periods = payload.duration_periods
    contract.payment_frequency = payload.payment_frequency
    contract.minimum_payment = payload.minimum_payment
    contract.late_penalty_severity = payload.late_penalty_severity
    contract.late_penalty_percent = payload.late_penalty_percent
    contract.dom_can_add_surprise_penalty = payload.dom_can_add_surprise_penalty
    contract.mid_contract_addition_mode = payload.mid_contract_addition_mode
    contract.exit_amount = payload.exit_amount


def apply_version_to_contract(contract: DebtContract, version: DebtContractVersion) -> None:
    contract.principal = version.principal
    contract.interest_rate = version.interest_rate
    contract.interest_period = version.interest_period
    contract.duration_periods = version.duration_periods
    contract.payment_frequency = version.payment_frequency
    contract.minimum_payment = version.minimum_payment
    contract.late_penalty_severity = version.late_penalty_severity
    contract.late_penalty_percent = version.late_penalty_percent
    contract.dom_can_add_surprise_penalty = version.dom_can_add_surprise_penalty
    contract.mid_contract_addition_mode = version.mid_contract_addition_mode
    contract.exit_amount = version.exit_amount


def adjustment_out(adjustment: ContractAdjustment) -> ContractAdjustmentOut:
    return ContractAdjustmentOut(
        id=adjustment.id,
        contract_id=adjustment.contract_id,
        proposed_by=adjustment.proposed_by,
        amount=Decimal(str(adjustment.amount)),
        reason=adjustment.reason,
        status=adjustment.status,
        created_at=adjustment.created_at,
        updated_at=adjustment.updated_at,
        resolved_at=adjustment.resolved_at,
    )
