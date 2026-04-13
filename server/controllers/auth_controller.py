from datetime import UTC, datetime

from core.config import get_settings
from core.exceptions import BadRequest, Forbidden, Unauthorized
from core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from daos.token_dao import TokenDao
from daos.user_dao import UserDao
from models.user import UserStatus
from schemas.auth import TokenPair
from services.email.base import EmailService
from services.email.render import render_template

_settings = get_settings()


class AuthController:
    def __init__(self, user_dao: UserDao, token_dao: TokenDao, email_service: EmailService) -> None:
        self._users = user_dao
        self._tokens = token_dao
        self._email = email_service

    async def login(self, email: str, password: str, ua: str | None, ip: str | None) -> TokenPair:
        user = await self._users.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise Unauthorized("invalid credentials")
        if user.status != UserStatus.ACTIVE:
            raise Forbidden("account not active")

        raw_refresh, _ = create_refresh_token()
        await self._tokens.create_refresh_token(user.id, raw_refresh, ua, ip)
        await self._users.update_last_login(user, datetime.now(UTC).replace(tzinfo=None))

        return TokenPair(
            access_token=create_access_token(str(user.id), user.role),
            refresh_token=raw_refresh,
            expires_in=_settings.jwt_access_ttl_minutes * 60,
        )

    async def refresh(self, raw_refresh: str) -> TokenPair:
        token_hash = hash_token(raw_refresh)
        rt = await self._tokens.get_refresh_by_hash(token_hash)
        if rt is None or rt.revoked_at is not None:
            raise Unauthorized("invalid or revoked refresh token")

        now = datetime.now(UTC).replace(tzinfo=None)
        if rt.expires_at < now:
            raise Unauthorized("refresh token expired")

        user = await self._users.get_by_id(rt.user_id)
        if user is None:
            raise Unauthorized("user not found")

        await self._tokens.revoke(rt)

        new_raw, _ = create_refresh_token()
        await self._tokens.create_refresh_token(user.id, new_raw, None, None)

        return TokenPair(
            access_token=create_access_token(str(user.id), user.role),
            refresh_token=new_raw,
            expires_in=_settings.jwt_access_ttl_minutes * 60,
        )

    async def logout(self, raw_refresh: str) -> None:
        token_hash = hash_token(raw_refresh)
        rt = await self._tokens.get_refresh_by_hash(token_hash)
        if rt is not None and rt.revoked_at is None:
            await self._tokens.revoke(rt)

    async def request_password_reset(self, email: str) -> None:
        user = await self._users.get_by_email(email)
        if user is None:
            return

        raw, _ = await self._tokens.create_reset_token(user.id)
        reset_url = f"{_settings.public_base_url}/reset-password?token={raw}"
        html = render_template("password_reset.html", reset_url=reset_url)
        await self._email.send(
            to=user.email,
            subject="Reset your password",
            html=html,
        )

    async def confirm_password_reset(self, token: str, new_password: str) -> None:
        token_row = await self._tokens.consume_reset_token(token)
        if token_row is None:
            raise BadRequest("invalid, used, or expired reset token")

        user = await self._users.get_by_id(token_row.user_id)
        if user is None:
            raise BadRequest("user not found")

        user.password_hash = hash_password(new_password)
        self._users._session.add(user)
        await self._tokens.revoke_all_refresh_for_user(user.id)
