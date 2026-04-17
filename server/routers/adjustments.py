from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.debt_controller import DebtController
from core.db import get_session
from decorators.audit import audit
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.adjustment import AdjustmentCreateIn, ContractAdjustmentOut, SurprisePenaltyIn
from schemas.debt import DebtContractOut
from schemas.payment_method import PaymentMethodOut

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch"}
_E404 = {"description": "Not found — contract or adjustment not visible to caller"}
_E409 = {"description": "Conflict — invalid state for this action"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}
_E500 = {"description": "Internal server error"}

router = APIRouter(tags=["debt-contracts"])


def _build(session: AsyncSession = Depends(get_session)) -> DebtController:
    return DebtController(session)


class BuyoutIntentOut(BaseModel):
    exit_amount: Decimal = Field(
        ...,
        description="Amount owed to buy out the contract (GBP)",
        examples=["250.00"],
    )
    payment_methods: list[PaymentMethodOut] = Field(
        ..., description="Goddess's enabled payment methods for completing the buyout"
    )


@router.post(
    "/sub/debts/{contract_id}/buyout-intent",
    summary="Quote a buyout amount for a sub-owned contract",
    description=(
        "Computes the prorated exit amount for the contract at the current moment "
        "and returns the goddess's enabled payment methods. No mutation — "
        "settlement happens when the sub declares a `buyout` payment and the goddess validates it."
    ),
    response_model=BuyoutIntentOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 500: _E500},
)
async def buyout_intent(
    contract_id: UUID,
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: DebtController = Depends(_build),
) -> BuyoutIntentOut:
    data = await ctrl.buyout_intent(user, contract_id)
    methods = [PaymentMethodOut.model_validate(m) for m in data["payment_methods"]]  # type: ignore[arg-type]
    return BuyoutIntentOut(exit_amount=data["exit_amount"], payment_methods=methods)  # type: ignore[arg-type]


@router.post(
    "/goddess/debts/{contract_id}/surprise-penalty",
    summary="Apply a surprise penalty to an active contract",
    description=(
        "Emits a `surprise_penalty` ledger event on the contract, adding the given amount "
        "to the balance. Only allowed when `dom_can_add_surprise_penalty` is true "
        "and the contract is `active`."
    ),
    response_model=DebtContractOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422, 500: _E500},
)
@audit(kind="surprise_penalty_applied", entity="debt_contract")
async def surprise_penalty(
    contract_id: UUID,
    body: SurprisePenaltyIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DebtController = Depends(_build),
) -> DebtContractOut:
    result = await ctrl.surprise_penalty(user, contract_id, body.amount, body.reason)
    await session.commit()
    return result


@router.post(
    "/goddess/debts/{contract_id}/adjustments",
    summary="Propose or apply a mid-contract adjustment",
    description=(
        "Behaviour depends on `mid_contract_addition_mode` on the contract:\n"
        "- `disabled` → 403\n"
        "- `dom_controlled` → status `applied`, balance updated immediately\n"
        "- `sub_approval_required` → status `pending_sub_approval`, sub must accept"
    ),
    response_model=ContractAdjustmentOut,
    status_code=201,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422, 500: _E500},
)
@audit(kind="adjustment_created", entity="contract_adjustment")
async def create_adjustment(
    contract_id: UUID,
    body: AdjustmentCreateIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DebtController = Depends(_build),
) -> ContractAdjustmentOut:
    result = await ctrl.create_adjustment(user, contract_id, body.amount, body.reason)
    await session.commit()
    return result


@router.post(
    "/sub/adjustments/{adjustment_id}/accept",
    summary="Accept a pending mid-contract adjustment",
    description=(
        "Sub accepts a pending adjustment proposed by the goddess. "
        "Emits an `adjustment` ledger event and transitions status to `accepted`."
    ),
    response_model=ContractAdjustmentOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 500: _E500},
)
async def accept_adjustment(
    adjustment_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: DebtController = Depends(_build),
) -> ContractAdjustmentOut:
    result = await ctrl.accept_adjustment(user, adjustment_id)
    await session.commit()
    return result


@router.post(
    "/sub/adjustments/{adjustment_id}/refuse",
    summary="Refuse a pending mid-contract adjustment",
    description=(
        "Sub refuses a pending adjustment. Status transitions to `refused`; "
        "no ledger event is emitted."
    ),
    response_model=ContractAdjustmentOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 500: _E500},
)
async def refuse_adjustment(
    adjustment_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: DebtController = Depends(_build),
) -> ContractAdjustmentOut:
    result = await ctrl.refuse_adjustment(user, adjustment_id)
    await session.commit()
    return result


@router.get(
    "/sub/adjustments/pending",
    summary="List pending adjustments for the authenticated sub",
    description="Returns all adjustments in `pending_sub_approval` across the sub's contracts.",
    response_model=list[ContractAdjustmentOut],
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 500: _E500},
)
async def list_pending(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: DebtController = Depends(_build),
) -> list[ContractAdjustmentOut]:
    return await ctrl.list_pending_adjustments(user)


@router.get(
    "/sub/approvals",
    summary="Deprecated alias for /sub/adjustments",
    description=(
        "Permanent redirect (308) to `/sub/adjustments/pending`. "
        "This is a W3 compatibility alias and will be reconciled in W8 ROUTING-1. "
        "The 308 status preserves the HTTP method and request body so clients using "
        "non-GET verbs are not silently downgraded."
    ),
    status_code=308,
    tags=["debt-contracts"],
    response_model=None,
    responses={401: _E401, 403: _E403},
)
async def approvals_alias(
    user: User = Depends(require_role(UserRole.sub)),
) -> RedirectResponse:
    return RedirectResponse(url="/sub/adjustments/pending", status_code=308)
