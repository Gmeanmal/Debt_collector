from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.debt_controller import DebtController
from core.db import get_session
from core.exceptions import Validation
from decorators.audit import audit
from dependencies.auth import get_current_user, require_role
from models.debt import DebtContract, DebtContractStatus
from models.user import User, UserRole
from schemas.debt import (
    ContractClausesUpdateIn,
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
@audit(kind="contract_created", entity="debt_contract")
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
@audit(kind="contract_counter_proposed", entity="debt_contract")
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
@audit(kind="contract_counter_accepted", entity="debt_contract")
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
@audit(kind="contract_counter_rejected", entity="debt_contract")
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
        "The signature PNG is stored as a base64 data URI on the contract row; "
        "no file is persisted to object storage. The PDF is generated on-the-fly."
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
    result = await ctrl.sign_as_sub(user, contract_id, body.signature_b64)
    await session.commit()
    return result


@router.get(
    "/debts/{contract_id}/pdf",
    summary="Download the contract PDF",
    description=(
        "Renders the contract PDF on-the-fly from the stored contract data and signature. "
        "Accessible to the contract's sub and to the owning goddess. "
        "When `draft=true` is passed, renders with a DRAFT watermark regardless of signing status. "
        "A signed contract embeds the sub's signature; an unsigned contract renders without one."
    ),
    response_class=Response,
    response_model=None,
    status_code=200,
    tags=["contracts"],
    responses={
        200: {
            "description": "Contract PDF bytes",
            "content": {"application/pdf": {}},
        },
        401: _E401,
        403: _E403,
        404: _E404,
        409: _E409,
        500: _E500,
    },
)
async def download_contract_pdf(
    contract_id: UUID,
    draft: bool = Query(default=False, description="When true, renders with a DRAFT watermark"),
    user: User = Depends(get_current_user),
    ctrl: DebtController = Depends(_build_controller),
) -> Response:
    data = await ctrl.generate_contract_pdf_bytes(user, contract_id, draft=draft)
    short_id = str(contract_id).upper()[:8]
    return Response(
        content=data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="contract-{short_id}.pdf"',
        },
    )


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
@audit(kind="contract_closed", entity="debt_contract")
async def close_as_goddess(
    contract_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DebtController = Depends(_build_controller),
) -> DebtContractOut:
    result = await ctrl.close_as_goddess(user, contract_id)
    await session.commit()
    return result


@router.patch(
    "/debts/{contract_id}/clauses",
    summary="Replace the clauses of a debt contract as goddess",
    description=(
        "Goddess replaces the full clauses array on a contract. "
        "Each clause is a `{id?, label, body, sort_order}` tuple; ids are preserved when "
        "supplied and otherwise generated server-side. `sort_order` is normalized to a "
        "dense `0..N-1` sequence in request order.\n\n"
        "**Re-signature flow.** If the contract is already `active` (signed) and the new "
        "clauses differ from the stored ones by `label`/`body`/`sort_order` (ids are "
        "ignored in the diff), the contract transitions back to `pending_sub_signature`, "
        "`signed_at` + `signature_b64` are cleared, and the sub receives a "
        "`contract_needs_resignature` notification.\n\n"
        "Pre-signature contracts (`pending_*` states) simply update in place with no "
        "status transition. Terminal contracts "
        "(`closed`, `breached`, `completed`, `cancelled_by_dom`) return 409."
    ),
    response_model=DebtContractOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422, 500: _E500},
)
@audit(kind="contract_clauses_updated", entity="debt_contract")
async def update_clauses(
    contract_id: UUID,
    body: ContractClausesUpdateIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DebtController = Depends(_build_controller),
) -> DebtContractOut:
    result = await ctrl.update_clauses(user, contract_id, body.clauses)
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
    "/goddess/contracts/by-slug/{slug}",
    summary="Get a debt contract by slug as goddess",
    description=(
        "Returns the debt contract identified by the given slug. "
        "Only accessible to the owning goddess. "
        "Allows the frontend to build URLs with short slugs instead of raw UUIDs."
    ),
    response_model=DebtContractOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 500: _E500},
)
async def get_contract_by_slug_goddess(
    slug: str,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DebtController = Depends(_build_controller),
) -> DebtContractOut:
    return await ctrl.get_by_slug_as_goddess(user, slug)


@router.get(
    "/sub/contracts/by-slug/{slug}",
    summary="Get a debt contract by slug as sub",
    description=(
        "Returns the debt contract identified by the given slug. "
        "Only accessible to the sub who owns the contract. "
        "Allows the frontend to build URLs with short slugs instead of raw UUIDs."
    ),
    response_model=DebtContractOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 500: _E500},
)
async def get_contract_by_slug_sub(
    slug: str,
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: DebtController = Depends(_build_controller),
) -> DebtContractOut:
    return await ctrl.get_by_slug_as_sub(user, slug)


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
        "Returns all debt contracts across all subs for the authenticated goddess, newest first. "
        "Supports optional filtering by status list, sub, and principal amount range. "
        "All filter parameters are optional; omitting them returns the full unfiltered list. "
        "When both `min_amount` and `max_amount` are supplied, `min_amount` must be ≤ `max_amount`."
    ),
    response_model=list[DebtContractOut],
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 422: _E422, 500: _E500},
)
async def list_goddess_contracts(
    status: list[DebtContractStatus] | None = Query(
        default=None,
        description=(
            "Filter to contracts whose status is in this list. "
            "Repeat the parameter for multiple values: `?status=active&status=breached`."
        ),
        examples=["active"],
    ),
    sub_id: UUID | None = Query(
        default=None,
        description="Filter to a single sub's contracts.",
        examples=["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
    ),
    min_amount: Decimal | None = Query(
        default=None,
        description="Filter contracts where principal ≥ min_amount (GBP).",
        examples=["100.00"],
    ),
    max_amount: Decimal | None = Query(
        default=None,
        description="Filter contracts where principal ≤ max_amount (GBP).",
        examples=["1000.00"],
    ),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DebtController = Depends(_build_controller),
) -> list[DebtContractOut]:
    if min_amount is not None and max_amount is not None and min_amount > max_amount:
        raise Validation(
            "min_amount must be ≤ max_amount",
            min_amount=str(min_amount),
            max_amount=str(max_amount),
        )
    return await ctrl.list_for_viewer(
        user,
        statuses=status,
        sub_id=sub_id,
        min_amount=min_amount,
        max_amount=max_amount,
    )
