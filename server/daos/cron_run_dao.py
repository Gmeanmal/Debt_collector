from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from models.cron_run import CronRun


class CronRunDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_started(
        self,
        dry_run: bool,
        triggered_by_user_id: UUID | None,
    ) -> CronRun:
        """Insert a new CronRun row with started_at set to now."""
        row = CronRun(dry_run=dry_run, triggered_by_user_id=triggered_by_user_id)
        self._session.add(row)
        await self._session.flush()
        return row

    async def finish(
        self,
        run_id: UUID,
        summary_json: dict[str, int],
        errors: list[dict[str, str]],
    ) -> CronRun:
        """Set finished_at and duration_ms, persist summary and errors."""
        result = await self._session.execute(select(CronRun).where(col(CronRun.id) == run_id))
        row = result.scalar_one()
        now = datetime.now(UTC).replace(tzinfo=None)
        row.finished_at = now
        row.summary_json = summary_json
        row.errors = errors
        row.duration_ms = int((now - row.started_at).total_seconds() * 1000)
        self._session.add(row)
        await self._session.flush()
        return row

    async def list_recent(self, limit: int = 50) -> list[CronRun]:
        """Return the most recent CronRun rows, newest first."""
        result = await self._session.execute(
            select(CronRun).order_by(col(CronRun.started_at).desc()).limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_id(self, run_id: UUID) -> CronRun | None:
        """Return a CronRun by primary key, or None if not found."""
        result = await self._session.execute(select(CronRun).where(col(CronRun.id) == run_id))
        return result.scalar_one_or_none()
