from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.payment_method_controller import PaymentMethodController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.payment_method import (
    PaymentMethodCreate,
    PaymentMethodOut,
    PaymentMethodUpdate,
    ReorderRequest,
)

router = APIRouter(prefix="/goddess/payment-methods", tags=["payment-methods"])

_ERROR_401 = {"description": "Unauthorized — missing or invalid access token"}
_ERROR_403 = {"description": "Forbidden — caller is not a goddess or has no goddess profile"}
_ERROR_404 = {
    "description": "Not found — payment method does not exist or belongs to another goddess"
}
_ERROR_422 = {"description": "Unprocessable entity — request body validation failed"}
_ERROR_500 = {"description": "Internal server error"}


def _build_controller(session: AsyncSession = Depends(get_session)) -> PaymentMethodController:
    return PaymentMethodController(session)


@router.get(
    "/",
    summary="List payment methods",
    description=(
        "Returns all payment methods owned by the authenticated Goddess, ordered by sort_order "
        "ascending. Pass `?enabled=true` to return only enabled methods."
    ),
    response_model=list[PaymentMethodOut],
    status_code=200,
    tags=["payment-methods"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        500: _ERROR_500,
    },
)
async def list_payment_methods(
    enabled: bool = Query(default=False, description="When true, return only enabled methods"),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PaymentMethodController = Depends(_build_controller),
) -> list[PaymentMethodOut]:
    return await ctrl.list_methods(user.id, enabled_only=enabled)


@router.post(
    "/",
    summary="Create a payment method",
    description=(
        "Creates a new payment method for the authenticated Goddess. "
        "The new method receives sort_order = max(existing) + 1 (appended to the bottom)."
    ),
    response_model=PaymentMethodOut,
    status_code=201,
    tags=["payment-methods"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def create_payment_method(
    body: PaymentMethodCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PaymentMethodController = Depends(_build_controller),
) -> PaymentMethodOut:
    result = await ctrl.create(user.id, body)
    await session.commit()
    return result


@router.patch(
    "/{method_id}",
    summary="Update a payment method",
    description=(
        "Partially updates a payment method owned by the authenticated Goddess. "
        "Only fields present in the request body are changed (patch semantics)."
    ),
    response_model=PaymentMethodOut,
    status_code=200,
    tags=["payment-methods"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def update_payment_method(
    method_id: UUID,
    body: PaymentMethodUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PaymentMethodController = Depends(_build_controller),
) -> PaymentMethodOut:
    result = await ctrl.update(user.id, method_id, body)
    await session.commit()
    return result


@router.delete(
    "/{method_id}",
    summary="Soft-delete a payment method",
    description=(
        "Disables a payment method by setting `enabled=false`. "
        "The record is retained for historical references in payment declarations."
    ),
    response_model=None,
    status_code=204,
    tags=["payment-methods"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        404: _ERROR_404,
        500: _ERROR_500,
    },
)
async def delete_payment_method(
    method_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PaymentMethodController = Depends(_build_controller),
) -> None:
    await ctrl.delete(user.id, method_id)
    await session.commit()


@router.post(
    "/reorder",
    summary="Reorder payment methods",
    description=(
        "Accepts a list of all payment method IDs in the desired display order. "
        "The position in the list becomes the new sort_order (0 = top). "
        "Raises 400 if any ID does not belong to this Goddess."
    ),
    response_model=list[PaymentMethodOut],
    status_code=200,
    tags=["payment-methods"],
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def reorder_payment_methods(
    body: ReorderRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PaymentMethodController = Depends(_build_controller),
) -> list[PaymentMethodOut]:
    result = await ctrl.reorder(user.id, body.method_ids)
    await session.commit()
    return result
