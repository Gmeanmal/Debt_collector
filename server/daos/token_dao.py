import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import hash_token
from models.user import PasswordResetToken, RefreshToken


class TokenDao:
    def __init__(
        self, session: AsyncSession, refresh_ttl_days: int, reset_ttl_minutes: int
    ) -> None:
        self._session = session
        self._refresh_ttl_days = refresh_ttl_days
        self._reset_ttl_minutes = reset_ttl_minutes

    async def create_refresh_token(
        self,
        user_id: UUID,
        raw_token: str,
        user_agent: str | None,
        ip: str | None,
    ) -> RefreshToken:
        expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=self._refresh_ttl_days)
        rt = RefreshToken(
            user_id=user_id,
            token_hash=hash_token(raw_token),
            expires_at=expires_at,
        )
        self._session.add(rt)
        await self._session.flush()
        return rt

    async def get_refresh_by_hash(self, token_hash: str) -> RefreshToken | None:
        result = await self._session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def revoke(self, rt: RefreshToken) -> None:
        rt.revoked_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(rt)

    async def create_reset_token(self, user_id: UUID) -> tuple[str, PasswordResetToken]:
        raw = secrets.token_urlsafe(48)
        expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(
            minutes=self._reset_ttl_minutes
        )
        token_row = PasswordResetToken(
            user_id=user_id,
            token_hash=hash_token(raw),
            expires_at=expires_at,
        )
        self._session.add(token_row)
        await self._session.flush()
        return raw, token_row

    async def consume_reset_token(self, raw_token: str) -> PasswordResetToken | None:
        result = await self._session.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(raw_token))
        )
        token_row = result.scalar_one_or_none()
        if token_row is None:
            return None
        now = datetime.now(UTC).replace(tzinfo=None)
        if token_row.used_at is not None or token_row.expires_at < now:
            return None
        token_row.used_at = now
        self._session.add(token_row)
        return token_row

    async def revoke_all_refresh_for_user(self, user_id: UUID) -> None:
        result = await self._session.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
        )
        now = datetime.now(UTC).replace(tzinfo=None)
        for rt in result.scalars():
            rt.revoked_at = now
            self._session.add(rt)
