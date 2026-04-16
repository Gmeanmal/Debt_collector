from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.wishlist_controller import WishlistController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.wishlist import (
    WishlistItemCreateIn,
    WishlistItemOut,
    WishlistItemProposeIn,
    WishlistItemUpdateIn,
)

_E400 = {"description": "Bad request — invalid payload or business rule violation"}
_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch"}
_E404 = {"description": "Not found — wishlist item does not exist"}
_E409 = {"description": "Conflict — item state prevents this operation"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}

goddess_router = APIRouter(prefix="/goddess/wishlist", tags=["wishlist-goddess"])
sub_router = APIRouter(prefix="/sub/wishlist", tags=["wishlist-sub"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> WishlistController:
    return WishlistController(session)


@goddess_router.get(
    "",
    summary="List wishlist items",
    description=(
        "Returns every wishlist item owned by the authenticated goddess, including "
        "cancelled and fulfilled ones. Each row carries a server-computed "
        "`collected` total summing validated allocations on this item."
    ),
    response_model=list[WishlistItemOut],
    status_code=200,
    tags=["wishlist-goddess"],
    responses={401: _E401, 403: _E403},
)
async def list_wishlist_for_goddess(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: WishlistController = Depends(_ctrl),
) -> list[WishlistItemOut]:
    return await ctrl.list_for_goddess(user)


@goddess_router.post(
    "",
    summary="Create a wishlist item",
    description=(
        "Goddess creates a wishlist item. The item is stored with "
        "`created_by=goddess`, `approved=true`, `status=open`. Optionally restrict "
        "the item to a single sub via `sub_id`; omit the field to make it visible "
        "to every sub under this goddess."
    ),
    response_model=WishlistItemOut,
    status_code=201,
    tags=["wishlist-goddess"],
    responses={400: _E400, 401: _E401, 403: _E403, 422: _E422},
)
async def create_wishlist_item(
    body: WishlistItemCreateIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: WishlistController = Depends(_ctrl),
) -> WishlistItemOut:
    result = await ctrl.create_as_goddess(user, body)
    await session.commit()
    return result


@goddess_router.patch(
    "/{wishlist_id}",
    summary="Update a wishlist item",
    description=(
        "Partially updates a wishlist item. `created_by` is immutable and cannot be "
        "supplied. `status=fulfilled` is set automatically by the payment pipeline "
        "and cannot be assigned manually; use DELETE to remove unapproved items or "
        "set `status=cancelled` to archive funded ones."
    ),
    response_model=WishlistItemOut,
    status_code=200,
    tags=["wishlist-goddess"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422},
)
async def update_wishlist_item(
    wishlist_id: UUID,
    body: WishlistItemUpdateIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: WishlistController = Depends(_ctrl),
) -> WishlistItemOut:
    result = await ctrl.update_as_goddess(user, wishlist_id, body)
    await session.commit()
    return result


@goddess_router.delete(
    "/{wishlist_id}",
    summary="Delete a wishlist item",
    description=(
        "Hard-deletes a wishlist item. Refuses with 409 if any payment allocation "
        "already points at this item — cancel the item instead to preserve history."
    ),
    response_model=None,
    status_code=204,
    tags=["wishlist-goddess"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409},
)
async def delete_wishlist_item(
    wishlist_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: WishlistController = Depends(_ctrl),
) -> Response:
    await ctrl.delete_as_goddess(user, wishlist_id)
    await session.commit()
    return Response(status_code=204)


@goddess_router.post(
    "/{wishlist_id}/approve",
    summary="Approve a sub-proposed wishlist item",
    description=(
        "Flips `approved=true` on a sub-proposed wishlist item so it becomes "
        "visible to subs. Returns 400 if the item was goddess-created (already approved)."
    ),
    response_model=WishlistItemOut,
    status_code=200,
    tags=["wishlist-goddess"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404},
)
async def approve_wishlist_item(
    wishlist_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: WishlistController = Depends(_ctrl),
) -> WishlistItemOut:
    result = await ctrl.approve_as_goddess(user, wishlist_id)
    await session.commit()
    return result


@goddess_router.post(
    "/{wishlist_id}/reject",
    summary="Reject a sub-proposed wishlist item",
    description=(
        "Hard-deletes a sub-proposed wishlist item that has not yet been approved. "
        "Returns 400 if the item was goddess-created or 409 if already approved "
        "(use DELETE to remove approved items)."
    ),
    response_model=None,
    status_code=204,
    tags=["wishlist-goddess"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409},
)
async def reject_wishlist_item(
    wishlist_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: WishlistController = Depends(_ctrl),
) -> Response:
    await ctrl.reject_as_goddess(user, wishlist_id)
    await session.commit()
    return Response(status_code=204)


@sub_router.get(
    "",
    summary="List visible wishlist items",
    description=(
        "Returns approved, open wishlist items for the authenticated sub's goddess. "
        "Includes both items marked for every sub (`sub_id=null`) and items "
        "explicitly assigned to this sub. Open items appear first."
    ),
    response_model=list[WishlistItemOut],
    status_code=200,
    tags=["wishlist-sub"],
    responses={400: _E400, 401: _E401, 403: _E403},
)
async def list_wishlist_for_sub(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: WishlistController = Depends(_ctrl),
) -> list[WishlistItemOut]:
    return await ctrl.list_for_sub(user)


@sub_router.post(
    "",
    summary="Propose a wishlist item",
    description=(
        "Sub proposes a wishlist item for their goddess to review. The item is "
        "stored with `created_by=sub`, `approved=false`, `sub_id` set to the "
        "calling sub. The goddess must explicitly approve the item before it "
        "becomes visible to subs."
    ),
    response_model=WishlistItemOut,
    status_code=201,
    tags=["wishlist-sub"],
    responses={400: _E400, 401: _E401, 403: _E403, 422: _E422},
)
async def propose_wishlist_item(
    body: WishlistItemProposeIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: WishlistController = Depends(_ctrl),
) -> WishlistItemOut:
    result = await ctrl.propose_as_sub(user, body)
    await session.commit()
    return result
