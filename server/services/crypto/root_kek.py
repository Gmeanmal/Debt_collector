import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from core.config import get_settings

ROOT_KEK_BYTES = 32
NONCE_BYTES = 12


def load_root_kek() -> bytes:
    """Decode and validate the root KEK from settings.

    Raises RuntimeError when the env var is absent or not 32 bytes after decode.
    Never echoes the key material in the error message.
    """
    raw = get_settings().root_kek_b64
    if not raw:
        raise RuntimeError(
            "ROOT_KEK_B64 is not set. "
            'Generate a 32-byte key with: python -c "import secrets,base64; '
            'print(base64.b64encode(secrets.token_bytes(32)).decode())"'
        )
    try:
        key = base64.b64decode(raw)
    except Exception as exc:
        raise RuntimeError("ROOT_KEK_B64 is not valid base64.") from exc
    if len(key) != ROOT_KEK_BYTES:
        raise RuntimeError(
            f"ROOT_KEK_B64 must decode to exactly {ROOT_KEK_BYTES} bytes (got {len(key)})."
        )
    return key


def generate_dek() -> bytes:
    """Return a fresh 32-byte data encryption key."""
    return os.urandom(ROOT_KEK_BYTES)


def wrap_dek(dek: bytes) -> tuple[bytes, bytes, int]:
    """Encrypt dek with the current root KEK using AES-256-GCM.

    Returns (wrapped_dek, nonce, root_kek_version).
    """
    root_kek = load_root_kek()
    version = get_settings().root_kek_version
    nonce = os.urandom(NONCE_BYTES)
    aesgcm = AESGCM(root_kek)
    wrapped = aesgcm.encrypt(nonce, dek, None)
    return wrapped, nonce, version


def unwrap_dek(wrapped: bytes, nonce: bytes, version: int) -> bytes:
    """Decrypt a wrapped DEK.

    Raises RuntimeError on version mismatch or authentication failure.
    """
    current_version = get_settings().root_kek_version
    if version != current_version:
        raise RuntimeError(
            f"KEK version mismatch: row was wrapped with version {version}, "
            f"current root KEK is version {current_version}. "
            "Rotate the wrapped DEK before decrypting."
        )
    root_kek = load_root_kek()
    aesgcm = AESGCM(root_kek)
    try:
        return aesgcm.decrypt(nonce, wrapped, None)
    except Exception as exc:
        raise RuntimeError("DEK decryption failed — ciphertext may be tampered.") from exc
