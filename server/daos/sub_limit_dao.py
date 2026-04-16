from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from core.exceptions import NotFound
from models.sub_limit import LimitKind, LimitSeverity, SubLimit


class SubLimitDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_sub(self, sub_id: UUID) -> list[SubLimit]:
        """Return all limits for the given sub, ordered by creation date descending."""
        result = await self._session.execute(
            select(SubLimit)
            .where(col(SubLimit.sub_id) == sub_id)
            .order_by(col(SubLimit.created_at).desc())
        )
        return list(result.scalars().all())

    async def list_unacknowledged_by_goddess(self, goddess_id: UUID) -> list[SubLimit]:
        """Return all hard limits across all subs of the given goddess that are unacknowledged."""
        result = await self._session.execute(
            select(SubLimit)
            .where(
                col(SubLimit.goddess_id) == goddess_id,
                col(SubLimit.acknowledged_by_goddess_at).is_(None),
            )
            .order_by(col(SubLimit.created_at).desc())
        )
        return list(result.scalars().all())

    async def create(
        self,
        *,
        sub_id: UUID,
        goddess_id: UUID,
        kind: LimitKind,
        body: str,
        severity: LimitSeverity,
    ) -> SubLimit:
        """Insert a new sub_limit row and return it."""
        limit = SubLimit(
            sub_id=sub_id,
            goddess_id=goddess_id,
            kind=kind,
            body=body,
            severity=severity,
        )
        self._session.add(limit)
        return limit

    async def get(self, limit_id: UUID) -> SubLimit:
        """Return the limit by PK, raising NotFound if absent."""
        row = await self._session.get(SubLimit, limit_id)
        if row is None:
            raise NotFound(f"sub_limit {limit_id} not found")
        return row

    async def update(
        self,
        limit_id: UUID,
        *,
        kind: LimitKind | None = None,
        body: str | None = None,
        severity: LimitSeverity | None = None,
        clear_acknowledgement: bool = False,
    ) -> SubLimit:
        """Update mutable fields on an existing limit row.

        When ``clear_acknowledgement`` is true, ``acknowledged_by_goddess_at`` is set back
        to ``None`` so the goddess must re-acknowledge after a sub-initiated edit.
        """
        row = await self.get(limit_id)
        if kind is not None:
            row.kind = kind
        if body is not None:
            row.body = body
        if severity is not None:
            row.severity = severity
        if clear_acknowledgement:
            row.acknowledged_by_goddess_at = None
        row.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(row)
        return row

    async def delete(self, limit_id: UUID) -> None:
        """Hard-delete the limit row, raising NotFound if absent."""
        row = await self.get(limit_id)
        await self._session.delete(row)

    async def acknowledge(self, limit_id: UUID, goddess_id: UUID) -> SubLimit:
        """Stamp acknowledged_by_goddess_at for the given goddess, raising NotFound if absent."""
        row = await self.get(limit_id)
        if row.goddess_id != goddess_id:
            raise NotFound(f"sub_limit {limit_id} not found for goddess {goddess_id}")
        row.acknowledged_by_goddess_at = datetime.now(UTC).replace(tzinfo=None)
        row.updated_at = datetime.now(UTC).replace(tzinfo=None)
        self._session.add(row)
        return row
