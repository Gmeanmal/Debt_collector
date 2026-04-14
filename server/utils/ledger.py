from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.debt import DebtContract
from models.debt_event import DebtEvent, EventType

_TWO_PLACES = Decimal("0.01")

_OP: dict[EventType, str] = {
    EventType.period_interest: "multiplicative",
    EventType.late_penalty: "multiplicative",
    EventType.payment_applied: "subtract",
    EventType.adjustment: "add",
    EventType.surprise_penalty: "add",
    EventType.buyout_paid: "close",
}


def replay_events(principal: Decimal, events: "list[DebtEvent] | tuple[DebtEvent, ...]") -> Decimal:
    balance = Decimal(str(principal))
    for event in events:
        amount = Decimal(str(event.amount))
        op = _OP[event.event_type]
        if op == "multiplicative":
            balance = (balance * (Decimal(1) + amount)).quantize(_TWO_PLACES)
        elif op == "subtract":
            balance = (balance - amount).quantize(_TWO_PLACES)
        elif op == "add":
            balance = (balance + amount).quantize(_TWO_PLACES)
        elif op == "close":
            balance = Decimal("0.00")
    return balance


async def recompute_balance(session: AsyncSession, contract_id: UUID) -> Decimal:
    contract = await session.get(DebtContract, contract_id)
    if contract is None:
        raise ValueError(f"contract {contract_id} not found")
    result = await session.execute(
        select(DebtEvent)
        .where(col(DebtEvent.contract_id) == contract_id)
        .order_by(col(DebtEvent.created_at).asc(), col(DebtEvent.id).asc())
    )
    events = list(result.scalars().all())
    return replay_events(contract.principal, events)


async def apply_event_and_recompute(session: AsyncSession, event: DebtEvent) -> Decimal:
    session.add(event)
    await session.flush()
    new_balance = await recompute_balance(session, event.contract_id)
    contract = await session.get(DebtContract, event.contract_id)
    if contract is not None:
        contract.balance = new_balance
        session.add(contract)
        await session.flush()
    return new_balance
