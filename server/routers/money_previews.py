from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.blacklist_controller import BlacklistController
from controllers.debt_controller import DebtController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.debt import DebtContractOut
from schemas.money_previews import (
    BreachPreviewIn,
    BreachPreviewOut,
    BuyoutPreviewOut,
    SurprisePenaltyCommitIn,
    SurprisePenaltyPreviewIn,
    SurprisePenaltyPreviewOut,
)

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch, or feature flag disabled"}
_E404 = {"description": "Not found — contract or sub not visible to caller"}
_E409 = {"description": "Conflict — action not valid for the current contract or sub state"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}
_E500 = {"description": "Internal server error"}

router = APIRouter()


def _build_debt(session: AsyncSession = Depends(get_session)) -> DebtController:
    return DebtController(session)


def _build_blacklist(session: AsyncSession = Depends(get_session)) -> BlacklistController:
    return BlacklistController(session)


@router.post(
    "/goddess/contracts/{slug}/surprise-penalty/preview",
    summary="Preview a surprise penalty on a contract",
    description=(
        "Returns the projected balance impact of applying a surprise penalty "
        "without mutating any state. "
        "Requires `dom_can_add_surprise_penalty = true` on the contract and status `active`. "
        "Use the returned figures to populate the confirmation modal before calling the "
        "commit endpoint."
    ),
    response_model=SurprisePenaltyPreviewOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422, 500: _E500},
)
async def surprise_penalty_preview(
    slug: str,
    body: SurprisePenaltyPreviewIn,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DebtController = Depends(_build_debt),
) -> SurprisePenaltyPreviewOut:
    return await ctrl.surprise_penalty_preview(user, slug, body.amount_gbp)


@router.post(
    "/goddess/contracts/{slug}/surprise-penalty",
    summary="Apply a confirmed surprise penalty to a contract",
    description=(
        "Applies a surprise penalty to the contract after the goddess has reviewed the preview "
        "and confirmed in the typed-confirmation modal. "
        "Creates a `ContractAdjustment` record (kind=`surprise_penalty`), emits a "
        "`surprise_penalty` ledger event that increases the balance, writes a "
        "`DebtContractAudit` row, and notifies the sub. "
        "Requires `dom_can_add_surprise_penalty = true` and status `active`. "
        "The `confirmed_at` timestamp proves the goddess saw the preview before submitting."
    ),
    response_model=DebtContractOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422, 500: _E500},
)
async def surprise_penalty_commit(
    slug: str,
    body: SurprisePenaltyCommitIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: DebtController = Depends(_build_debt),
) -> DebtContractOut:
    result = await ctrl.surprise_penalty_by_slug(
        user, slug, body.amount_gbp, body.reason, body.confirmed_at
    )
    await session.commit()
    return result


@router.post(
    "/sub/contracts/{slug}/buyout/preview",
    summary="Preview the buyout amount for a contract",
    description=(
        "Computes the pro-rated exit amount the sub would owe to buy out the contract "
        "at the current moment in time, without mutating any state. "
        "Formula: `exit_amount * (elapsed_periods / duration_periods)`. "
        "Only available on `active` contracts owned by the calling sub. "
        "The actual buyout is committed by declaring a `buyout` payment and having the "
        "goddess validate it — the commit endpoint is not part of this slice."
    ),
    response_model=BuyoutPreviewOut,
    status_code=200,
    tags=["debt-contracts"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 500: _E500},
)
async def buyout_preview(
    slug: str,
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: DebtController = Depends(_build_debt),
) -> BuyoutPreviewOut:
    return await ctrl.buyout_preview_by_slug(user, slug)


@router.post(
    "/goddess/subs/{username}/breach/preview",
    summary="Preview the impact of breaching a sub",
    description=(
        "Returns a read-only summary of what the breach action would do, "
        "without mutating any state. "
        "Intended to populate the Danger-zone typed-confirmation modal before the goddess "
        "commits the breach via `POST /goddess/subs/{sub_id}/breach`. "
        "Returns the number of active contracts that would cascade to `breached`, "
        "the combined balance that would be snapshotted on the blacklist entry, "
        "and whether the sub would be blacklisted (always true unless already blacklisted)."
    ),
    response_model=BreachPreviewOut,
    status_code=200,
    tags=["blacklist"],
    responses={401: _E401, 403: _E403, 404: _E404, 500: _E500},
)
async def breach_preview(
    username: str,
    body: BreachPreviewIn,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: BlacklistController = Depends(_build_blacklist),
) -> BreachPreviewOut:
    return await ctrl.breach_preview(user, username, body.reason)
