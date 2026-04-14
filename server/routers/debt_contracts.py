from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.debt_controller import DebtController
from core.db import get_session
from dependencies.auth import get_current_user, require_role
from models.debt import DebtContract, DebtContractStatus
from models.user import User, UserRole
from schemas.debt import (
    DebtContractAuditOut,
    DebtContractCounter,
    DebtContractCreate,
    DebtContractOut,
    DebtContractSignIn,
    DebtSimulationOut,
    DebtSimulationPeriod,
)
from utils.finance import monthly_rate, period_rate, severe_warning, simulate

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch"}
_E404 = {"description": "Not found — contract does not exist or is not visible to caller"}
_E409 = {"description": "Conflict — transition not valid from the current contract status"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}
_E500 = {"description": "Internal server error"}

router = APIRouter(tags=["debt-contracts"])


def _build_controller(session: AsyncSession = Depends(get_session)) -> DebtController:
    return DebtController(session)


def _draft_contract(payload: DebtContractCreate) -> DebtContract:
    return DebtContract(
        sub_id=UUID(int=0),
        goddess_id=UUID(int=0),
        principal=Decimal(str(payload.principal)),
        interest_rate=Decimal(str(payload.interest_rate)),
        interest_period=payload.interest_period,
        duration_periods=payload.duration_periods,
        payment_frequency=payload.payment_frequency,
        minimum_payment=Decimal(str(payload.minimum_payment)),
        late_penalty_severity=payload.late_penalty_severity,
        late_penalty_percent=Decimal(str(payload.late_penalty_percent)),
        dom_can_add_surprise_penalty=payload.dom_can_add_surprise_penalty,
        mid_contract_addition_mode=payload.mid_contract_addition_mode,
        exit_amount=Decimal(str(payload.exit_amount)),
        status=DebtContractStatus.pending_sub,
        balance=Decimal(str(payload.principal)),
    )


@router.post(
    "/debts/simulate",
    summary="Simulate a debt contract projection",
    description=(
        "Stateless simulation: given a full contract draft, returns a period-by-period "
        "projection assuming minimum payments and no late penalties, plus a severe-penalty "
        "warning flag. Callable on drafts from the contract form."
    ),
    response_model=DebtSimulationOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 422: _E422, 500: _E500},
)
async def simulate_draft(
    body: DebtContractCreate,
    _user: User = Depends(get_current_user),
) -> DebtSimulationOut:
    draft = _draft_contract(body)
    periods = [DebtSimulationPeriod(**row) for row in simulate(draft)]
    return DebtSimulationOut(
        periods=periods,
        severe_warning=severe_warning(draft),
        period_rate=period_rate(draft),
        monthly_rate=monthly_rate(draft),
    )


@router.post(
    "/goddess/subs/{sub_id}/debts",
    summary="Propose a debt contract as goddess",
    description=(
        "Goddess proposes a new debt contract for one of her subs. "
        "The contract is created in `pending_sub` status awaiting the sub's response. "
        "Sub must belong to this goddess or a 404 is returned."
    ),
    response_model=DebtContractOut,
    status_code=201,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 422: _E422, 500: _E500},
)
async def propose_as_goddess(
    sub_id: UUID,
    body: DebtContractCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DebtController = Depends(_build_controller),
) -> DebtContractOut:
    result = await ctrl.propose_as_goddess(user, sub_id, body)
    await session.commit()
    return result


@router.post(
    "/sub/debts",
    summary="Propose a debt contract as sub",
    description=(
        "Sub proposes a new debt contract directed at their goddess. "
        "The contract is created in `pending_dom` status awaiting the goddess's response. "
        "Sub must be linked to a goddess or a 400 is returned."
    ),
    response_model=DebtContractOut,
    status_code=201,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 422: _E422, 500: _E500},
)
async def propose_as_sub(
    body: DebtContractCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: DebtController = Depends(_build_controller),
) -> DebtContractOut:
    result = await ctrl.propose_as_sub(user, body)
    await session.commit()
    return result


@router.post(
    "/debts/{contract_id}/counter-propose",
    summary="Counter-propose on a debt contract",
    description=(
        "Sub or goddess submits a counter-proposal on an in-negotiation contract. "
        "Sub may counter when status is `pending_sub`; "
        "goddess may counter when status is `pending_dom`. "
        "Only one counter per side is allowed; a second counter raises 409. "
        "The actor is inferred from the bearer token."
    ),
    response_model=DebtContractOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422, 500: _E500},
)
async def counter_propose(
    contract_id: UUID,
    body: DebtContractCounter,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    ctrl: DebtController = Depends(_build_controller),
) -> DebtContractOut:
    result = await ctrl.counter_propose(user, contract_id, body)
    await session.commit()
    return result


@router.post(
    "/debts/{contract_id}/accept-counter",
    summary="Accept the sub's counter-proposal",
    description=(
        "Goddess accepts the sub's counter-proposal. "
        "Contract moves to `pending_sub_signature`; sub must sign to activate. "
        "Only valid when status is `pending_dom_counter`."
    ),
    response_model=DebtContractOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 500: _E500},
)
async def accept_counter(
    contract_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DebtController = Depends(_build_controller),
) -> DebtContractOut:
    result = await ctrl.accept_counter(user, contract_id)
    await session.commit()
    return result


@router.post(
    "/debts/{contract_id}/reject-counter",
    summary="Reject the sub's counter-proposal",
    description=(
        "Goddess rejects the sub's counter-proposal. "
        "Contract terms revert to the original round-0 version; "
        "contract moves to `pending_sub_signature` — "
        "sub must sign the original or leave it pending. "
        "Only valid when status is `pending_dom_counter`."
    ),
    response_model=DebtContractOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 500: _E500},
)
async def reject_counter(
    contract_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DebtController = Depends(_build_controller),
) -> DebtContractOut:
    result = await ctrl.reject_counter(user, contract_id)
    await session.commit()
    return result


@router.post(
    "/debts/{contract_id}/sign",
    summary="Sign a debt contract as sub",
    description=(
        "Sub signs the finalised contract, transitioning it to `active`. "
        "Valid when status is `pending_sub` (direct sign on goddess proposal) "
        "or `pending_sub_signature` (post-negotiation). "
        "Renders the signed PDF from the supplied signature PNG, uploads it to object "
        "storage, and populates `signed_pdf_url` and `signed_pdf_sha256` on the contract."
    ),
    response_model=DebtContractOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422, 500: _E500},
)
async def sign_as_sub(
    contract_id: UUID,
    body: DebtContractSignIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: DebtController = Depends(_build_controller),
) -> DebtContractOut:
    result = await ctrl.sign_as_sub(user, contract_id, body.signature_png_b64)
    await session.commit()
    return result


@router.get(
    "/debts/{contract_id}/pdf",
    summary="Download the signed contract PDF",
    description=(
        "Returns a 302 redirect to a short-lived presigned URL for the contract's signed PDF. "
        "Accessible to the contract's sub and to the owning goddess. "
        "Returns 404 when the contract has not been signed yet."
    ),
    response_class=RedirectResponse,
    response_model=None,
    status_code=302,
    tags=["debt-contracts"],
    responses={
        302: {"description": "Redirect to the presigned PDF URL"},
        401: _E401,
        403: _E403,
        404: _E404,
        500: _E500,
    },
)
async def download_contract_pdf(
    contract_id: UUID,
    user: User = Depends(get_current_user),
    ctrl: DebtController = Depends(_build_controller),
) -> RedirectResponse:
    url = await ctrl.download_pdf(user, contract_id)
    return RedirectResponse(url=url, status_code=302)


@router.post(
    "/goddess/debts/{contract_id}/close",
    summary="Cancel a pending contract as goddess",
    description=(
        "Goddess cancels a contract that is still in a `pending_*` state. "
        "Transitions the contract to `cancelled_by_dom`. "
        "Cannot be used on active, closed, breached, or completed contracts."
    ),
    response_model=DebtContractOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 500: _E500},
)
async def close_as_goddess(
    contract_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DebtController = Depends(_build_controller),
) -> DebtContractOut:
    result = await ctrl.close_as_goddess(user, contract_id)
    await session.commit()
    return result


@router.get(
    "/debts/{contract_id}",
    summary="Get a debt contract",
    description=(
        "Returns a single debt contract. "
        "Sub may only see their own contracts; "
        "goddess may only see contracts belonging to her subs."
    ),
    response_model=DebtContractOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 500: _E500},
)
async def get_contract(
    contract_id: UUID,
    user: User = Depends(get_current_user),
    ctrl: DebtController = Depends(_build_controller),
) -> DebtContractOut:
    return await ctrl.get(user, contract_id)


@router.get(
    "/debts/{contract_id}/audit",
    summary="Get audit trail for a debt contract",
    description=(
        "Returns the full ordered audit trail for a contract. "
        "Visibility rules match those of the `GET /debts/{contract_id}` endpoint."
    ),
    response_model=list[DebtContractAuditOut],
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 500: _E500},
)
async def get_contract_audit(
    contract_id: UUID,
    user: User = Depends(get_current_user),
    ctrl: DebtController = Depends(_build_controller),
) -> list[DebtContractAuditOut]:
    return await ctrl.list_audit(user, contract_id)


@router.get(
    "/sub/debts",
    summary="List own debt contracts as sub",
    description="Returns all debt contracts belonging to the authenticated sub, newest first.",
    response_model=list[DebtContractOut],
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 500: _E500},
)
async def list_sub_contracts(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: DebtController = Depends(_build_controller),
) -> list[DebtContractOut]:
    return await ctrl.list_for_viewer(user)


@router.get(
    "/goddess/debts",
    summary="List all debt contracts for goddess",
    description=(
        "Returns all debt contracts across all subs for the authenticated goddess, newest first."
    ),
    response_model=list[DebtContractOut],
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 500: _E500},
)
async def list_goddess_contracts(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DebtController = Depends(_build_controller),
) -> list[DebtContractOut]:
    return await ctrl.list_for_viewer(user)
