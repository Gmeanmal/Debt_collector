import io
from uuid import UUID, uuid4

from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.exceptions import BadRequest, Forbidden
from daos.sub_photo_dao import SubPhotoDao
from models.sub_photo import SubPhoto
from models.user import User
from services.storage import object_store

_ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
_EXT_MAP = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


def _strip_exif(raw: bytes, mime_type: str) -> bytes:
    """Return image bytes with all EXIF/metadata removed via Pillow.

    We re-encode to the same format so the resulting bytes can be stored
    directly. JPEG quality is capped at 90 — sufficient for sub photos and
    avoids re-inflation of already-compressed images.
    """
    img = Image.open(io.BytesIO(raw))
    buf = io.BytesIO()
    fmt = img.format or _PIL_FORMAT[mime_type]
    save_kwargs: dict[str, object] = {}
    if fmt == "JPEG":
        save_kwargs["quality"] = 90
    img.save(buf, format=fmt, **save_kwargs)
    return buf.getvalue()


_PIL_FORMAT = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
}


class SubPhotoController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = SubPhotoDao(session)

    async def upload(
        self,
        caller: User,
        file_bytes: bytes,
        mime_type: str,
    ) -> tuple[SubPhoto, str]:
        """Validate, strip EXIF, upload to object store, insert DB row.

        Returns ``(SubPhoto, presigned_url)`` so the router can build the
        response without a second round-trip to the object store.

        Raises ``BadRequest`` for unsupported MIME, oversized files, or when
        the sub has no assigned goddess (cannot determine the bucket key).
        """
        if mime_type not in _ALLOWED_MIME:
            raise BadRequest(
                f"unsupported MIME type '{mime_type}'; allowed: {sorted(_ALLOWED_MIME)}"
            )
        if len(file_bytes) > _MAX_BYTES:
            raise BadRequest(f"file too large: {len(file_bytes)} bytes (limit {_MAX_BYTES})")
        if caller.goddess_id is None:
            raise Forbidden("sub has no assigned goddess; cannot upload photo")

        goddess_id: UUID = caller.goddess_id
        clean_bytes = _strip_exif(file_bytes, mime_type)
        ext = _EXT_MAP[mime_type]
        key = f"{goddess_id}/{caller.id}/{uuid4()}.{ext}"

        settings = get_settings()
        bucket = settings.s3_bucket_sub_photos

        await object_store.upload_object(
            bucket=bucket,
            key=key,
            body=clean_bytes,
            content_type=mime_type,
            settings=settings,
        )

        photo = await self._dao.create(
            sub_id=caller.id,
            goddess_id=goddess_id,
            r2_key=key,
            mime_type=mime_type,
            byte_size=len(clean_bytes),
        )

        presigned_url = await object_store.generate_presigned_url(
            bucket=bucket,
            key=key,
            ttl_seconds=600,
            settings=settings,
        )

        return photo, presigned_url
