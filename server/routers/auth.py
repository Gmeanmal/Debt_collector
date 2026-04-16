from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.auth_controller import AuthController
from core.config import Settings, get_settings
from core.db import get_session
from core.rate_limit import limiter
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

_settings = get_settings()

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
        avatar_key=user.avatar_key,
        payment_handle=user.payment_handle,
        theme_preference=user.theme_preference,
        gender=user.gender,
        pronouns=user.pronouns,
        location=user.location,
        timezone=user.timezone,
        date_of_birth=user.date_of_birth,
        real_name=user.real_name,
        created_at=user.created_at,
        impersonator_id=impersonator.id if impersonator else None,
        impersonator_display_name=_display_name(impersonator) if impersonator else None,
    )


def _set_refresh_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=token,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite,  # type: ignore[arg-type]
        max_age=settings.jwt_refresh_ttl_days * 86400,
        path="/",
        domain=settings.refresh_cookie_domain or None,
    )


def _clear_refresh_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path="/",
        domain=settings.refresh_cookie_domain or None,
    )


def _resolve_refresh_token(cookie_token: str | None, body_token: str) -> str:
    """Prefer cookie; fall back to body for legacy clients."""
    token = cookie_token or body_token
    if not token:
        raise HTTPException(status_code=401, detail="missing refresh token")
    return token


@router.post(
    "/login",
    summary="Authenticate with email and password",
    description=(
        "Validates credentials and returns a JWT access token. "
        "The refresh token is delivered as an HttpOnly cookie named `debt_refresh` "
        "(attributes: Secure, SameSite=Lax, path=/) and is **not** present in the JSON body "
        "(`refresh_token` is always an empty string in the response). "
        "The cookie is rotated automatically by `POST /auth/refresh`."
    ),
    response_model=TokenPair,
    status_code=200,
    responses={
        401: _ERROR_401,
        403: _ERROR_403,
        422: _ERROR_422,
        429: {"description": "Too many requests — rate limit exceeded"},
        500: _ERROR_500,
    },
)
@limiter.limit(lambda: _settings.rate_limit_login)  # type: ignore[misc]
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    ctrl: AuthController = Depends(_build_controller),
) -> TokenPair:
    ua = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    pair = await ctrl.login(body.email, body.password, ua, ip)
    await session.commit()
    settings = get_settings()
    _set_refresh_cookie(response, pair.refresh_token, settings)
    return TokenPair(
        access_token=pair.access_token,
        refresh_token="",
        token_type="bearer",
        expires_in=pair.expires_in,
    )


@router.post(
    "/refresh",
    summary="Rotate refresh token and issue new access token",
    description=(
        "Reads the refresh token from the HttpOnly cookie `debt_refresh`, validates it "
        "(not revoked, not expired), revokes it, and issues a new token pair. "
        "Rolling refresh — the old token is immediately invalidated and a new cookie is set. "
        "Legacy fallback: if the cookie is absent and `refresh_token` is supplied in the JSON "
        "body, that value is accepted instead. "
        "Returns 401 if neither cookie nor body token is present."
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
    response: Response,
    body: RefreshRequest,
    session: AsyncSession = Depends(get_session),
    ctrl: AuthController = Depends(_build_controller),
    debt_refresh: str | None = Cookie(default=None),
) -> TokenPair:
    raw = _resolve_refresh_token(debt_refresh, body.refresh_token)
    pair = await ctrl.refresh(raw)
    await session.commit()
    settings = get_settings()
    _set_refresh_cookie(response, pair.refresh_token, settings)
    return TokenPair(
        access_token=pair.access_token,
        refresh_token="",
        token_type="bearer",
        expires_in=pair.expires_in,
    )


@router.post(
    "/logout",
    summary="Revoke refresh token and clear cookie",
    description=(
        "Reads the refresh token from the HttpOnly cookie `debt_refresh` and marks it as revoked. "
        "The cookie is cleared regardless of whether the token was valid. "
        "Idempotent — calling with an already-revoked or unknown token still returns 204. "
        "Legacy fallback: if the cookie is absent and `refresh_token` is supplied in the JSON "
        "body, that value is accepted instead."
    ),
    response_model=None,
    status_code=204,
    responses={
        422: _ERROR_422,
        500: _ERROR_500,
    },
)
async def logout(
    response: Response,
    body: RefreshRequest,
    session: AsyncSession = Depends(get_session),
    ctrl: AuthController = Depends(_build_controller),
    debt_refresh: str | None = Cookie(default=None),
) -> Response:
    raw = debt_refresh or body.refresh_token
    if raw:
        await ctrl.logout(raw)
        await session.commit()
    settings = get_settings()
    _clear_refresh_cookie(response, settings)
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
        429: {"description": "Too many requests — rate limit exceeded"},
        500: _ERROR_500,
    },
)
@limiter.limit(lambda: _settings.rate_limit_password_reset)  # type: ignore[misc]
async def password_reset_request(
    request: Request,
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
        429: {"description": "Too many requests — rate limit exceeded"},
        500: _ERROR_500,
    },
)
@limiter.limit(lambda: _settings.rate_limit_password_reset)  # type: ignore[misc]
async def password_reset_confirm(
    request: Request,
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
