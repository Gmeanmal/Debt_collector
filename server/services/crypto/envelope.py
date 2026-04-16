import os
from uuid import UUID

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy.ext.asyncio import AsyncSession

from services.crypto import goddess_kek as goddess_kek_service
from services.crypto.root_kek import unwrap_dek

NONCE_BYTES = 12


async def encrypt_for_goddess(
    session: AsyncSession,
    goddess_id: UUID,
    plaintext: bytes,
    aad: bytes = b"",
) -> bytes:
    """Encrypt plaintext with the goddess's DEK using AES-256-GCM.

    Output layout: nonce(12) || ciphertext_and_tag.
    Pass a field-specific aad (e.g. b"sub_medical:<sub_id>:blood_type") to bind
    the ciphertext to its column; any copy-paste to another field will fail to decrypt.
    """
    kek_row = await goddess_kek_service.ensure_goddess_kek(session, goddess_id)
    dek = unwrap_dek(kek_row.wrapped_dek, kek_row.nonce, kek_row.root_kek_version)
    nonce = os.urandom(NONCE_BYTES)
    aesgcm = AESGCM(dek)
    ciphertext_and_tag = aesgcm.encrypt(nonce, plaintext, aad or None)
    return nonce + ciphertext_and_tag


async def decrypt_for_goddess(
    session: AsyncSession,
    goddess_id: UUID,
    ciphertext: bytes,
    aad: bytes = b"",
) -> bytes:
    """Decrypt a blob produced by encrypt_for_goddess.

    Raises cryptography.exceptions.InvalidTag when the ciphertext is tampered,
    the wrong key is used, or the aad does not match the one used at encrypt time.
    """
    kek_row = await goddess_kek_service.ensure_goddess_kek(session, goddess_id)
    dek = unwrap_dek(kek_row.wrapped_dek, kek_row.nonce, kek_row.root_kek_version)
    nonce = ciphertext[:NONCE_BYTES]
    body = ciphertext[NONCE_BYTES:]
    aesgcm = AESGCM(dek)
    return aesgcm.decrypt(nonce, body, aad or None)


async def rewrap_goddess_dek(
    session: AsyncSession,
    goddess_id: UUID,
    new_root_kek_version: int,
) -> None:
    """Re-encrypt the goddess DEK under a new root KEK version.

    Not yet implemented — KEK rotation lands in J3+.
    """
    raise NotImplementedError("KEK rotation lands in J3+")
