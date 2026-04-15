import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from core.config import get_settings
from core.exceptions import Unauthorized

_settings = get_settings()
_hasher = PasswordHasher(
    memory_cost=_settings.argon2_memory_cost,
    time_cost=_settings.argon2_time_cost,
    parallelism=_settings.argon2_parallelism,
)


def _prepare_password(plain: str) -> str:
    # base64 prevents null-byte truncation and the 72-char bcrypt/argon2 footgun.
    # HMAC binds the digest to the pepper so a DB-only leak can't feed offline cracking.
    if _settings.password_pepper:
        digest = hmac.new(
            _settings.password_pepper.encode(),
            plain.encode(),
            hashlib.sha256,
        ).digest()
        return base64.b64encode(digest).decode()
    return base64.b64encode(plain.encode()).decode()


def hash_password(plain: str) -> str:
    return _hasher.hash(_prepare_password(plain))


def verify_password_with_rehash(plain: str, hashed: str) -> tuple[bool, str | None]:
    """Verify a password and return (ok, new_hash_or_none).

    new_hash_or_none is set when the stored hash was produced with the legacy
    format (plain text, no pepper pre-processing) or when argon2 parameters
    have drifted and a rehash is warranted.
    """
    prepared = _prepare_password(plain)

    # Fast path: new format (peppered + base64).
    try:
        _hasher.verify(hashed, prepared)
        if _hasher.check_needs_rehash(hashed):
            return True, hash_password(plain)
        return True, None
    except VerifyMismatchError:
        pass
    except (InvalidHashError, ValueError):
        return False, None

    # Slow path: legacy format (plain text fed directly to argon2).
    try:
        _hasher.verify(hashed, plain)
        # Always rehash legacy hashes to upgrade to the new format.
        return True, hash_password(plain)
    except (VerifyMismatchError, InvalidHashError, ValueError):
        return False, None


def verify_password(plain: str, hashed: str) -> bool:
    ok, _ = verify_password_with_rehash(plain, hashed)
    return ok


def create_access_token(
    subject: str,
    role: str,
    extra: dict[str, Any] | None = None,
    ttl_minutes: int | None = None,
) -> str:
    now = datetime.now(UTC)
    minutes = ttl_minutes if ttl_minutes is not None else _settings.jwt_access_ttl_minutes
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=minutes)).timestamp()),
        "typ": "access",
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, _settings.jwt_secret_key, algorithm=_settings.jwt_algorithm)


def create_refresh_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, hash_token(raw)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        data = jwt.decode(token, _settings.jwt_secret_key, algorithms=[_settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise Unauthorized("token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise Unauthorized("invalid token") from exc
    if data.get("typ") != "access":
        raise Unauthorized("wrong token type")
    return data


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
