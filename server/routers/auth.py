from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.auth_controller import AuthController
from core.config import get_settings
from core.db import get_session
from daos.token_dao import TokenDao
from daos.user_dao import UserDao
from dependencies.auth import AuthContext, get_auth_context
from models.user import User
from schemas.auth import (
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    TokenPair,
    UserOut,
)
from services.email.factory import get_email_service

router = APIRouter(prefix="/auth", tags=["auth"])

_ERROR_401 = {"description": "Unauthorized — missing or invalid credentials / token"}
_ERROR_403 = {"description": "Forbidden — account inactive or role not permitted"}
_ERROR_400 = {"description": "Bad request — invalid, used, or expired token"}
_ERROR_422 = {"description": "Unprocessable entity — request body validation failed"}
_ERROR_500 = {"description": "Internal server error"}


def _build_controller(session: AsyncSession = Depends(get_session)) -> AuthController:
    settings = get_settings()
    return AuthController(
        user_dao=UserDao(session),
        token_dao=TokenDao(
            session,
            refresh_ttl_days=settings.jwt_refresh_ttl_days,
            reset_ttl_minutes=settings.password_reset_ttl_minutes,
        ),
        email_service=get_email_service(settings),
    )


def _display_name(user: User) -> str:
    parts = [p for p in [user.first_name, user.last_name] if p]
    return " ".join(parts) if parts else user.username


def _user_out(user: User, impersonator: User | None = None) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        status=user.status,
        display_name=_display_name(user),
        first_name=user.first_name,
        last_name=user.last_name,
        bio=user.bio,
        avatar_url=user.avatar_url,
        theme_preference=user.theme_preference,
        created_at=user.created_at,
        impersonator_id=impersonator.id if impersonator else None,
        impersonator_display_name=_display_name(impersonator) if impersonator else None,
    )


@router.post(
    "/login",
    summary="Authenticate with email and password",
    description=(
        "Validates credentials and returns a JWT access token plus an opaque refresh token. "
        "The refresh token is stored hashed server-side and must be rotated on each use."
    ),
    response_model=TokenPair,
    status_code=200,
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def login(
    body: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
    ctrl: AuthController = Depends(_build_controller),
) -> TokenPair:
    ua = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    pair = await ctrl.login(body.email, body.password, ua, ip)
    await session.commit()
    return pair


@router.post(
    "/refresh",
    summary="Rotate refresh token and issue new access token",
    description=(
        "Consumes the provided refresh token (validates it is not revoked or expired), "
        "revokes it, and issues a new token pair. Rolling refresh — the old token becomes invalid."
    ),
    response_model=TokenPair,
    status_code=200,
    responses={
        401: _ERROR_401,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def refresh(
    body: RefreshRequest,
    session: AsyncSession = Depends(get_session),
    ctrl: AuthController = Depends(_build_controller),
) -> TokenPair:
    pair = await ctrl.refresh(body.refresh_token)
    await session.commit()
    return pair


@router.post(
    "/logout",
    summary="Revoke refresh token",
    description=(
        "Marks the supplied refresh token as revoked. Idempotent — calling with an already "
        "revoked or unknown token still returns 204."
    ),
    response_model=None,
    status_code=204,
    responses={
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def logout(
    body: RefreshRequest,
    session: AsyncSession = Depends(get_session),
    ctrl: AuthController = Depends(_build_controller),
) -> Response:
    await ctrl.logout(body.refresh_token)
    await session.commit()
    return Response(status_code=204)


@router.post(
    "/password-reset/request",
    summary="Request a password reset email",
    description=(
        "Sends a password reset link to the supplied email if an account exists. "
        "Always returns 202 to prevent user enumeration."
    ),
    response_model=None,
    status_code=202,
    responses={
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def password_reset_request(
    body: PasswordResetRequest,
    session: AsyncSession = Depends(get_session),
    ctrl: AuthController = Depends(_build_controller),
) -> Response:
    await ctrl.request_password_reset(body.email)
    await session.commit()
    return Response(status_code=202)


@router.post(
    "/password-reset/confirm",
    summary="Confirm password reset with token",
    description=(
        "Validates the reset token (checks expiry and not-used), sets the new password, "
        "and revokes all active refresh tokens for the user."
    ),
    response_model=None,
    status_code=204,
    responses={
        400: _ERROR_400,
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def password_reset_confirm(
    body: PasswordResetConfirm,
    session: AsyncSession = Depends(get_session),
    ctrl: AuthController = Depends(_build_controller),
) -> Response:
    await ctrl.confirm_password_reset(body.token, body.new_password)
    await session.commit()
    return Response(status_code=204)


@router.get(
    "/me",
    summary="Return the authenticated user's profile",
    description="Decodes the Bearer access token and returns the caller's profile.",
    response_model=UserOut,
    status_code=200,
    responses={
        401: _ERROR_401,
        500: _ERROR_500,
    },
)
async def me(ctx: AuthContext = Depends(get_auth_context)) -> UserOut:
    return _user_out(ctx.user, ctx.impersonator)
