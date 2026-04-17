from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.payment.proof import ALLOWED_PROOF_MIMES, MAX_PROOF_BYTES
from controllers.payment_controller import PaymentController
from core.db import get_session
from core.exceptions import PayloadTooLarge, UnsupportedMediaType, Validation
from decorators.audit import audit
from dependencies.auth import require_role
from models.payment import PaymentCategory
from models.user import User, UserRole
from schemas.payment import (
    DeclarePaymentIn,
    EditDeclarationIn,
    PaymentOut,
    RecordPaymentIn,
    RejectIn,
    ValidateIn,
)
from schemas.payment_method import PaymentMethodOut

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch"}
_E404 = {"description": "Not found — declaration or resource does not exist"}
_E400 = {"description": "Bad request — invalid category or business rule violation"}
_E409 = {"description": "Conflict — declaration is not in the expected status"}
_E413 = {"description": "Payload too large — proof file exceeds the 5 MB limit"}
_E415 = {"description": "Unsupported media type — proof must be jpeg, png, or webp"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}


def _ctrl(session: AsyncSession = Depends(get_session)) -> PaymentController:
    return PaymentController(session)


sub_router = APIRouter(prefix="/sub/payments", tags=["payments-sub"])
goddess_router = APIRouter(prefix="/goddess/payments", tags=["payments-goddess"])
sub_methods_router = APIRouter(prefix="/sub/payment-methods", tags=["payments-sub"])
goddess_subs_router = APIRouter(prefix="/goddess/subs", tags=["goddess-subs"])


# ── Sub endpoints ────────────────────────────────────────────────────────────


@sub_router.post(
    "",
    summary="Declare a payment",
    description=(
        "Sub declares a payment they have made via multipart/form-data. "
        "A proof screenshot (jpeg, png, or webp, ≤ 5 MB) is mandatory; "
        "the server validates MIME and size, strips EXIF from JPEGs, and stores "
        "the object under `<goddess_id>/<sub_id>/<declaration_id>.<ext>` in the "
        "`payment-proofs` bucket. The response includes a presigned GET URL valid "
        "for 10 minutes. "
        "Category `entry` only allowed while sub status is `pending_entry_tribute`. "
        "Category `tribute` allowed for active subs. "
        "Categories `rolling`, `weekly_debt`, `debt_payment`, `buyout` are reserved "
        "for future phases."
    ),
    response_model=PaymentOut,
    status_code=201,
    tags=["payments-sub"],
    responses={
        400: _E400,
        401: _E401,
        403: _E403,
        404: _E404,
        413: _E413,
        415: _E415,
        422: _E422,
    },
)
async def declare_payment(
    proof: UploadFile = File(..., description="Payment proof screenshot (jpeg/png/webp, ≤ 5 MB)."),
    category: PaymentCategory = Form(..., description="Payment category."),
    amount: str = Form(..., description="Payment amount in GBP (≤ 2 decimal places)."),
    method_id: UUID = Form(..., description="UUID of the payment method used."),
    external_timestamp: datetime | None = Form(
        default=None,
        description="UTC datetime when the payment was actually made (sub-reported).",
    ),
    note: str | None = Form(default=None, description="Optional note from the sub."),
    target_id: UUID | None = Form(
        default=None,
        description="Polymorphic target (contract or rolling cycle ID).",
    ),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: PaymentController = Depends(_ctrl),
) -> PaymentOut:
    """Declare a payment with a mandatory proof screenshot."""
    mime = proof.content_type or ""
    if mime not in ALLOWED_PROOF_MIMES:
        raise UnsupportedMediaType(
            f"unsupported proof MIME type '{mime}'; allowed: {sorted(ALLOWED_PROOF_MIMES)}"
        )

    raw = await proof.read()
    if len(raw) > MAX_PROOF_BYTES:
        raise PayloadTooLarge(f"proof file too large: {len(raw)} bytes (limit {MAX_PROOF_BYTES})")

    try:
        parsed_amount = Decimal(amount)
    except (InvalidOperation, ValueError) as exc:
        raise Validation(f"amount is not a valid decimal: {amount!r}") from exc

    try:
        body = DeclarePaymentIn(
            amount=parsed_amount,
            method_id=method_id,
            category=category,
            external_timestamp=external_timestamp,
            note=note,
            target_id=target_id,
        )
    except ValueError as exc:
        raise Validation(str(exc)) from exc

    result = await ctrl.declare_as_sub(user, body, proof_bytes=raw, proof_mime=mime)
    await session.commit()
    return result


@sub_router.patch(
    "/{declaration_id}",
    summary="Edit a pending declaration",
    description=(
        "Partially updates a pending declaration owned by this sub. "
        "Only fields supplied are changed. Raises 409 if declaration is not pending."
    ),
    response_model=PaymentOut,
    status_code=200,
    tags=["payments-sub"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422},
)
async def edit_declaration(
    declaration_id: UUID,
    body: EditDeclarationIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: PaymentController = Depends(_ctrl),
) -> PaymentOut:
    result = await ctrl.edit_pending_as_sub(user, declaration_id, body)
    await session.commit()
    return result


@sub_router.delete(
    "/{declaration_id}",
    summary="Cancel a pending declaration",
    description=(
        "Marks a pending declaration as cancelled. Raises 409 if not pending. "
        "Cancelled declarations remain in history."
    ),
    response_model=None,
    status_code=204,
    tags=["payments-sub"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409},
)
async def cancel_declaration(
    declaration_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: PaymentController = Depends(_ctrl),
) -> None:
    await ctrl.cancel_pending_as_sub(user, declaration_id)
    await session.commit()


@sub_router.get(
    "",
    summary="List own payment history",
    description=(
        "Returns the authenticated sub's payment declarations ordered by declared_at descending."
    ),
    response_model=list[PaymentOut],
    status_code=200,
    tags=["payments-sub"],
    responses={401: _E401, 403: _E403},
)
async def list_my_payments(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: PaymentController = Depends(_ctrl),
) -> list[PaymentOut]:
    return await ctrl.list_my_history(user)


# ── Sub payment methods endpoint ─────────────────────────────────────────────


@sub_methods_router.get(
    "",
    summary="List enabled payment methods for sub's goddess",
    description=(
        "Returns the enabled payment methods belonging to the authenticated sub's goddess. "
        "Used by subs when filing a payment declaration."
    ),
    response_model=list[PaymentMethodOut],
    status_code=200,
    tags=["payments-sub"],
    responses={400: _E400, 401: _E401, 403: _E403},
)
async def list_sub_payment_methods(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: PaymentController = Depends(_ctrl),
) -> list[PaymentMethodOut]:
    methods = await ctrl.list_sub_payment_methods(user)
    from schemas.payment_method import PaymentMethodOut as PMOut

    return [PMOut.model_validate(m) for m in methods]


# ── Goddess endpoints ─────────────────────────────────────────────────────────


@goddess_router.get(
    "",
    summary="List pending payment declarations",
    description=(
        "Returns declarations for this goddess filtered by status. "
        "Currently only `status=pending` is supported. Other values are ignored and return pending."
    ),
    response_model=list[PaymentOut],
    status_code=200,
    tags=["payments-goddess"],
    responses={401: _E401, 403: _E403},
)
async def list_pending_payments(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PaymentController = Depends(_ctrl),
) -> list[PaymentOut]:
    return await ctrl.list_pending(user)


@goddess_router.post(
    "/{declaration_id}/validate",
    summary="Validate a pending declaration",
    description=(
        "Validates a pending declaration, optionally re-categorising it first. "
        "Emits a payment allocation. On `entry` category, promotes the sub to `active`. "
        "Raises 409 if declaration is not pending."
    ),
    response_model=PaymentOut,
    status_code=200,
    tags=["payments-goddess"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422},
)
@audit(kind="payment_validated", entity="payment_declaration")
async def validate_declaration(
    declaration_id: UUID,
    body: ValidateIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PaymentController = Depends(_ctrl),
) -> PaymentOut:
    result = await ctrl.validate(user, declaration_id, body.recategorize_to)
    await session.commit()
    return result


@goddess_router.post(
    "/{declaration_id}/reject",
    summary="Reject a pending declaration",
    description=(
        "Marks a pending declaration as rejected. "
        "`reason` is required (min 5 chars) and is shown to the sub. "
        "Raises 409 if declaration is not pending."
    ),
    response_model=PaymentOut,
    status_code=200,
    tags=["payments-goddess"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422},
)
@audit(kind="payment_rejected", entity="payment_declaration")
async def reject_declaration(
    declaration_id: UUID,
    body: RejectIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PaymentController = Depends(_ctrl),
) -> PaymentOut:
    result = await ctrl.reject(user, declaration_id, body.reason)
    await session.commit()
    return result


@goddess_router.post(
    "/record",
    summary="Record a payment on behalf of a sub",
    description=(
        "Goddess creates an already-validated declaration on behalf of a sub. "
        "Emits allocation immediately. On `entry` category, promotes sub to `active`."
    ),
    response_model=PaymentOut,
    status_code=201,
    tags=["payments-goddess"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 422: _E422},
)
@audit(kind="payment_recorded", entity="payment_declaration")
async def record_payment(
    body: RecordPaymentIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PaymentController = Depends(_ctrl),
) -> PaymentOut:
    result = await ctrl.record_as_goddess(user, body)
    await session.commit()
    return result


# ── Goddess subs endpoint ──────────────────────────────────────────────────────


@goddess_subs_router.get(
    "",
    summary="List subs for this goddess",
    description="Returns a minimal list of users linked to the authenticated goddess.",
    response_model=list[dict[str, Any]],
    status_code=200,
    tags=["goddess-subs"],
    responses={401: _E401, 403: _E403},
)
async def list_goddess_subs(
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: PaymentController = Depends(_ctrl),
) -> list[dict[str, Any]]:
    return await ctrl.list_subs(user)
