from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from core.exceptions import NotFound
from models.sub_photo import SubPhoto, SubPhotoStatus


class SubPhotoDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        sub_id: UUID,
        goddess_id: UUID,
        r2_key: str,
        mime_type: str,
        byte_size: int,
    ) -> SubPhoto:
        """Insert a new sub photo row with ``pending`` status and return it."""
        photo = SubPhoto(
            sub_id=sub_id,
            goddess_id=goddess_id,
            r2_key=r2_key,
            mime_type=mime_type,
            byte_size=byte_size,
            status=SubPhotoStatus.pending,
        )
        self._session.add(photo)
        return photo

    async def get(self, photo_id: UUID) -> SubPhoto:
        """Return a photo by id or raise ``NotFound``."""
        row = await self._session.get(SubPhoto, photo_id)
        if row is None:
            raise NotFound(f"sub_photo {photo_id} not found")
        return row

    async def list_for_sub(
        self,
        sub_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[SubPhoto]:
        """Return all photos for the given sub, newest first."""
        result = await self._session.execute(
            select(SubPhoto)
            .where(col(SubPhoto.sub_id) == sub_id)
            .order_by(col(SubPhoto.uploaded_at).desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def list_pending_for_goddess(
        self,
        goddess_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[SubPhoto]:
        """Return pending photos across all subs belonging to the goddess."""
        result = await self._session.execute(
            select(SubPhoto)
            .where(
                col(SubPhoto.goddess_id) == goddess_id,
                col(SubPhoto.status) == SubPhotoStatus.pending,
            )
            .order_by(col(SubPhoto.uploaded_at).asc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())
