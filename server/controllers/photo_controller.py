import io
from datetime import datetime
from uuid import UUID, uuid4

from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from core.config import get_settings
from core.exceptions import BadRequest, Forbidden
from daos.sub_photo_dao import SubPhotoDao
from models.sub_photo import SubPhoto
from models.user import User
from schemas.sub_photo import SubPhotoQueueOut, SubPhotoTopOut
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


def _sub_display_name(sub: User) -> str | None:
    parts = [p for p in (sub.first_name, sub.last_name) if p]
    return " ".join(parts) or None


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

    async def list_pending_queue(
        self,
        caller: User,
        limit: int = 50,
        before: datetime | None = None,
    ) -> list[SubPhotoQueueOut]:
        """Return pending photos for the goddess with one presigned URL per entry.

        Results are newest-first, cursor-paginated by ``before`` (``uploaded_at``).
        Raises ``Forbidden`` if the caller has no linked goddess profile.
        """
        goddess_id = await resolve_goddess_id(self._session, caller.id)
        settings = get_settings()
        bucket = settings.s3_bucket_sub_photos
        pairs = await self._dao.get_pending_for_goddess(
            goddess_id=goddess_id,
            limit=limit,
            before=before,
        )
        queue: list[SubPhotoQueueOut] = []
        for photo, sub in pairs:
            url = await object_store.generate_presigned_url(
                bucket=bucket,
                key=photo.r2_key,
                ttl_seconds=600,
                settings=settings,
            )
            queue.append(
                SubPhotoQueueOut(
                    id=photo.id,
                    sub_id=sub.id,
                    sub_username=sub.username,
                    sub_display_name=_sub_display_name(sub),
                    uploaded_at=photo.uploaded_at,
                    mime_type=photo.mime_type,
                    byte_size=photo.byte_size,
                    presigned_get_url=url,
                )
            )
        return queue

    async def approve_photo(
        self,
        photo_id: UUID,
        caller: User,
    ) -> tuple[SubPhoto, str]:
        """Approve a pending sub photo and return the updated row with a fresh presigned URL.

        Raises ``NotFound`` if the photo does not exist.
        Raises ``Forbidden`` if the photo does not belong to this goddess.
        """
        goddess_id = await resolve_goddess_id(self._session, caller.id)
        photo = await self._dao.get(photo_id)
        if photo.goddess_id != goddess_id:
            raise Forbidden("photo does not belong to your sub")
        updated = await self._dao.approve(photo_id=photo_id, reviewer_id=goddess_id)
        settings = get_settings()
        url = await object_store.generate_presigned_url(
            bucket=settings.s3_bucket_sub_photos,
            key=updated.r2_key,
            ttl_seconds=600,
            settings=settings,
        )
        return updated, url

    async def top_approved_photo(
        self,
        sub_id: UUID,
        goddess_user_id: UUID,
    ) -> SubPhotoTopOut | None:
        """Return the most recently approved photo for a sub under the given goddess.

        Returns None when the sub has no approved photos.
        Raises Forbidden when the sub does not belong to the calling goddess.
        """
        goddess_id = await resolve_goddess_id(self._session, goddess_user_id)
        photo = await self._dao.top_approved_for_sub(sub_id)
        if photo is None:
            return None
        if photo.goddess_id != goddess_id:
            raise Forbidden("photo does not belong to your sub")
        settings = get_settings()
        url = await object_store.generate_presigned_url(
            bucket=settings.s3_bucket_sub_photos,
            key=photo.r2_key,
            ttl_seconds=600,
            settings=settings,
        )
        return SubPhotoTopOut(id=photo.id, presigned_get_url=url, reviewed_at=photo.reviewed_at)

    async def reject_photo(
        self,
        photo_id: UUID,
        caller: User,
        reason: str,
    ) -> SubPhoto:
        """Reject a pending sub photo (soft delete — object key preserved for GC).

        Raises ``NotFound`` if the photo does not exist.
        Raises ``Forbidden`` if the photo does not belong to this goddess.
        """
        goddess_id = await resolve_goddess_id(self._session, caller.id)
        photo = await self._dao.get(photo_id)
        if photo.goddess_id != goddess_id:
            raise Forbidden("photo does not belong to your sub")
        return await self._dao.reject(photo_id=photo_id, reviewer_id=goddess_id, reason=reason)
