from decimal import Decimal
from uuid import uuid4

from models.debt_event import DebtEvent, EventType
from utils.ledger import replay_events


def _event(event_type: EventType, amount: Decimal) -> DebtEvent:
    return DebtEvent.model_construct(
        id=uuid4(),
        contract_id=uuid4(),
        event_type=event_type,
        amount=amount,
        period_index=None,
        note=None,
    )


def test_replay_no_events_returns_principal() -> None:
    balance = replay_events(Decimal("500.00"), [])
    assert balance == Decimal("500.00")


def test_replay_payment_applied_decrements_balance() -> None:
    events = [_event(EventType.payment_applied, Decimal("50.00"))]
    assert replay_events(Decimal("500.00"), events) == Decimal("450.00")


def test_replay_period_interest_multiplies() -> None:
    events = [_event(EventType.period_interest, Decimal("0.20"))]
    assert replay_events(Decimal("500.00"), events) == Decimal("600.00")


def test_replay_late_penalty_multiplies() -> None:
    events = [_event(EventType.late_penalty, Decimal("0.10"))]
    assert replay_events(Decimal("500.00"), events) == Decimal("550.00")


def test_replay_surprise_penalty_adds() -> None:
    events = [_event(EventType.surprise_penalty, Decimal("25.00"))]
    assert replay_events(Decimal("500.00"), events) == Decimal("525.00")


def test_replay_buyout_paid_closes_to_zero() -> None:
    events = [
        _event(EventType.period_interest, Decimal("0.20")),
        _event(EventType.buyout_paid, Decimal("123.45")),
    ]
    assert replay_events(Decimal("500.00"), events) == Decimal("0.00")


def test_replay_mixed_sequence() -> None:
    events = [
        _event(EventType.period_interest, Decimal("0.10")),  # 500 -> 550
        _event(EventType.payment_applied, Decimal("50.00")),  # -> 500
        _event(EventType.adjustment, Decimal("20.00")),  # -> 520
    ]
    assert replay_events(Decimal("500.00"), events) == Decimal("520.00")
