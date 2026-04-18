from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFound
from models.sub_profile import OwnershipStatus, SubProfile


class SubProfileDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_user_id(self, user_id: UUID) -> SubProfile:
        """Return the sub_profile row for the given user, raising NotFound if absent."""
        row = await self._session.get(SubProfile, user_id)
        if row is None:
            raise NotFound(f"sub_profile not found for user {user_id}")
        return row

    async def create_default_row(self, user_id: UUID) -> SubProfile:
        """Insert a sub_profile row with default values for a newly created sub."""
        profile = SubProfile(
            user_id=user_id,
            ownership_status=OwnershipStatus.free,
            joined_empire_at=datetime.now(UTC).replace(tzinfo=None),
        )
        self._session.add(profile)
        return profile

    async def upsert(
        self,
        user_id: UUID,
        *,
        real_name: str | None = None,
        age: int | None = None,
        gender_id: UUID | None = None,
        pronouns: str | None = None,
        location: str | None = None,
        timezone: str | None = None,
        ownership_status: OwnershipStatus | None = None,
    ) -> SubProfile:
        """Update editable fields on an existing sub_profile row."""
        row = await self._session.get(SubProfile, user_id)
        if row is None:
            raise NotFound(f"sub_profile not found for user {user_id}")
        if real_name is not None:
            row.real_name = real_name
        if age is not None:
            row.age = age
        if gender_id is not None:
            row.gender_id = gender_id
        if pronouns is not None:
            row.pronouns = pronouns
        if location is not None:
            row.location = location
        if timezone is not None:
            row.timezone = timezone
        if ownership_status is not None:
            row.ownership_status = ownership_status
        row.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(row)
        return row
