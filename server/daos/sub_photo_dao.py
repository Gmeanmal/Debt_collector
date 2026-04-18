from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from core.exceptions import NotFound
from models.sub_photo import SubPhoto, SubPhotoStatus
from models.user import User


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

    async def get_pending_for_goddess(
        self,
        goddess_id: UUID,
        limit: int = 50,
        before: datetime | None = None,
    ) -> list[tuple[SubPhoto, User]]:
        """Return pending photos for the goddess joined with their sub's User row.

        Results are ordered by ``uploaded_at`` descending (newest first).
        Pass ``before`` (a UTC-naive datetime) for cursor-based pagination.
        """
        stmt = (
            select(SubPhoto, User)
            .join(User, col(SubPhoto.sub_id) == col(User.id))
            .where(
                col(SubPhoto.goddess_id) == goddess_id,
                col(SubPhoto.status) == SubPhotoStatus.pending,
            )
            .order_by(col(SubPhoto.uploaded_at).desc())
            .limit(limit)
        )
        if before is not None:
            stmt = stmt.where(col(SubPhoto.uploaded_at) < before)
        result = await self._session.execute(stmt)
        return [(row.SubPhoto, row.User) for row in result.all()]

    async def approve(self, photo_id: UUID, reviewer_id: UUID) -> SubPhoto:
        """Flip status to approved and stamp review metadata.

        Idempotent: returns the row unchanged if already approved.
        Raises ``NotFound`` if the photo does not exist.
        """
        photo = await self.get(photo_id)
        if photo.status == SubPhotoStatus.approved:
            return photo
        photo.status = SubPhotoStatus.approved
        photo.reviewed_at = datetime.now(UTC).replace(tzinfo=None)
        photo.reviewed_by = reviewer_id
        self._session.add(photo)
        return photo

    async def count_pending_review(self, goddess_id: UUID) -> int:
        """Return the number of sub photos awaiting goddess review."""
        result = await self._session.execute(
            select(func.count())
            .select_from(SubPhoto)
            .where(
                col(SubPhoto.goddess_id) == goddess_id,
                col(SubPhoto.status) == SubPhotoStatus.pending,
            )
        )
        return int(result.scalar_one() or 0)

    async def top_approved_for_sub(self, sub_id: UUID) -> SubPhoto | None:
        """Return the most recently approved photo for the given sub, or None."""
        result = await self._session.execute(
            select(SubPhoto)
            .where(
                col(SubPhoto.sub_id) == sub_id,
                col(SubPhoto.status) == SubPhotoStatus.approved,
            )
            .order_by(col(SubPhoto.reviewed_at).desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def reject(self, photo_id: UUID, reviewer_id: UUID, reason: str) -> SubPhoto:
        """Flip status to rejected, stamp review metadata, and store rejection reason.

        Soft delete only — the object-store key is preserved for 30-day GC.
        Idempotent: returns the row unchanged if already rejected.
        Raises ``NotFound`` if the photo does not exist.
        """
        photo = await self.get(photo_id)
        if photo.status == SubPhotoStatus.rejected:
            return photo
        photo.status = SubPhotoStatus.rejected
        photo.reviewed_at = datetime.now(UTC).replace(tzinfo=None)
        photo.reviewed_by = reviewer_id
        photo.rejection_reason = reason
        self._session.add(photo)
        return photo
