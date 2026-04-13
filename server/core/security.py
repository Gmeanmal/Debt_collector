import hashlib
import secrets
from datetime import UTC, datetime, timedelta

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


def hash_password(plain: str) -> str:
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, plain)
    except (VerifyMismatchError, InvalidHashError, ValueError):
        return False


def create_access_token(subject: str, role: str, extra: dict | None = None) -> str:
    now = datetime.now(UTC)
    payload: dict = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=_settings.jwt_access_ttl_minutes)).timestamp()),
        "typ": "access",
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, _settings.jwt_secret_key, algorithm=_settings.jwt_algorithm)


def create_refresh_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, hash_token(raw)


def decode_access_token(token: str) -> dict:
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
