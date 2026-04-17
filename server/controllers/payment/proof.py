"""Helpers for payment proof uploads: MIME maps, key convention, EXIF strip."""

import io
from uuid import UUID

from PIL import Image

ALLOWED_PROOF_MIMES: frozenset[str] = frozenset({"image/jpeg", "image/png", "image/webp"})
MAX_PROOF_BYTES: int = 5 * 1024 * 1024

_EXT_MAP: dict[str, str] = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def build_proof_key(goddess_id: UUID, sub_id: UUID, declaration_id: UUID, mime: str) -> str:
    ext = _EXT_MAP[mime]
    return f"{goddess_id}/{sub_id}/{declaration_id}.{ext}"


def strip_exif_if_jpeg(raw: bytes, mime: str) -> bytes:
    """Remove EXIF metadata from JPEG payloads. PNG/WEBP are returned as-is.

    PNG uses ancillary chunks (no EXIF proper); WEBP metadata is rare for screenshots
    and Pillow's re-encode would rebuild the bitstream unnecessarily.
    """
    if mime != "image/jpeg":
        return raw
    img = Image.open(io.BytesIO(raw))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()
