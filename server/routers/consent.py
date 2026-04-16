from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.consent_controller import ConsentController
from core.db import get_session
from dependencies.auth import get_current_user
from models.user import User
from schemas.consent import (
    ConsentAcceptanceIn,
    ConsentAcceptanceOut,
    ConsentTextOut,
    MyConsentsOut,
)

_ERROR_401 = {"description": "Unauthorized — missing or invalid access token"}
_ERROR_404 = {"description": "Not found — the slug has no published consent text"}
_ERROR_409 = {"description": "Conflict — the authenticated user has already accepted this version"}
_ERROR_422 = {
    "description": (
        "Unprocessable entity — request body validation failed, or `consent_text_id` "
        "does not match the current version for the given slug"
    )
}
_ERROR_428 = {
    "description": (
        "Precondition required — the authenticated user must accept the current version "
        "of a required consent before accessing the gated resource"
    )
}
_ERROR_500 = {"description": "Internal server error"}

router = APIRouter(tags=["consent"])


def _build_controller(session: AsyncSession = Depends(get_session)) -> ConsentController:
    return ConsentController(session)


@router.get(
    "/consent/{slug}",
    summary="Get the current consent text for a slug",
    description=(
        "Returns the latest published version of the consent text family identified by "
        "`slug`. Authenticated users of any role may call this endpoint so the client can "
        "render the markdown body and collect an acceptance."
    ),
    response_model=ConsentTextOut,
    status_code=200,
    tags=["consent"],
    responses={
        401: _ERROR_401,
        404: _ERROR_404,
        500: _ERROR_500,
    },
)
async def get_current_consent(
    slug: str,
    _: User = Depends(get_current_user),
    ctrl: ConsentController = Depends(_build_controller),
) -> ConsentTextOut:
    return await ctrl.get_current(slug)


@router.post(
    "/consent/{slug}/accept",
    summary="Record acceptance of the current consent text",
    description=(
        "Records the authenticated user's acceptance of a specific consent text version. "
        "The request body must carry the `consent_text_id` the client just read, which is "
        "cross-checked against the server's current version for the slug. The originating "
        "IP address is captured for audit. "
        "Returns 404 if the slug has no published text, 422 if `consent_text_id` is stale, "
        "and 409 if the user has already accepted this exact version."
    ),
    response_model=ConsentAcceptanceOut,
    status_code=201,
    tags=["consent"],
    responses={
        401: _ERROR_401,
        404: _ERROR_404,
        409: _ERROR_409,
        422: _ERROR_422,
        428: _ERROR_428,
        500: _ERROR_500,
    },
)
async def accept_consent(
    slug: str,
    body: ConsentAcceptanceIn,
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    ctrl: ConsentController = Depends(_build_controller),
) -> ConsentAcceptanceOut:
    ip = request.client.host if request.client else None
    result = await ctrl.accept(
        user_id=user.id,
        slug=slug,
        consent_text_id=body.consent_text_id,
        ip_address=ip,
    )
    await session.commit()
    return result


@router.get(
    "/me/consents",
    summary="List my consent acceptances",
    description=(
        "Returns every consent-text version the authenticated user has accepted, newest "
        "first. Each entry carries the slug, version, and UTC `accepted_at` timestamp. "
        "Use `GET /consent/{slug}` to fetch the full markdown body when required."
    ),
    response_model=MyConsentsOut,
    status_code=200,
    tags=["consent"],
    responses={
        401: _ERROR_401,
        500: _ERROR_500,
    },
)
async def list_my_consents(
    user: User = Depends(get_current_user),
    ctrl: ConsentController = Depends(_build_controller),
) -> MyConsentsOut:
    return await ctrl.list_for_user(user.id)
