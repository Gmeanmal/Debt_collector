from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from core.exceptions import Forbidden, NotFound
from daos.sub_limit_dao import SubLimitDao
from daos.sub_trigger_dao import SubTriggerDao
from daos.user_dao import UserDao
from models.sub_limit import SubLimit
from models.sub_trigger import SubTrigger
from models.user import Goddess, User
from schemas.limits import (
    SubLimitCreate,
    SubLimitOut,
    SubLimitUpdate,
    SubTriggerCreate,
    SubTriggerOut,
    SubTriggerUpdate,
)
from utils.placeholder_guard import reject_if_placeholder


def _compose_limit_body(label: str, notes: str | None) -> str:
    if notes is None or notes == "":
        return label
    return f"{label}\n\n{notes}"


def _to_limit_out(record: SubLimit) -> SubLimitOut:
    return SubLimitOut.model_validate(record)


def _to_trigger_out(record: SubTrigger) -> SubTriggerOut:
    return SubTriggerOut.model_validate(record)


class LimitsController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._limits = SubLimitDao(session)
        self._triggers = SubTriggerDao(session)
        self._users = UserDao(session)

    async def _resolve_goddess_id(self, goddess_user_id: UUID) -> UUID:
        result = await self._session.execute(
            select(Goddess)
            .join(User, col(User.goddess_id) == col(Goddess.id))
            .where(col(User.id) == goddess_user_id)
        )
        goddess = result.scalar_one_or_none()
        if goddess is None:
            raise Forbidden("goddess profile not found for this user")
        return goddess.id

    async def _require_sub_goddess(self, sub_id: UUID) -> UUID:
        user = await self._users.get_by_id(sub_id)
        if user is None or user.goddess_id is None:
            raise Forbidden("sub is not assigned to a goddess")
        return user.goddess_id

    async def _assert_sub_under_goddess(self, goddess_user_id: UUID, sub_id: UUID) -> None:
        goddess_id = await self._resolve_goddess_id(goddess_user_id)
        sub = await self._users.get_by_id(sub_id)
        if sub is None:
            raise NotFound("sub not found")
        if sub.goddess_id != goddess_id:
            raise Forbidden("sub does not belong to this goddess")

    async def list_own_limits(self, sub_id: UUID) -> list[SubLimitOut]:
        """Return every limit owned by the calling sub, newest first."""
        rows = await self._limits.list_by_sub(sub_id)
        return [_to_limit_out(row) for row in rows]

    async def create_own_limit(self, sub_id: UUID, body: SubLimitCreate) -> SubLimitOut:
        """Create a limit row for the calling sub; acknowledgement starts null."""
        reject_if_placeholder(body.label, "label")
        goddess_id = await self._require_sub_goddess(sub_id)
        row = await self._limits.create(
            sub_id=sub_id,
            goddess_id=goddess_id,
            kind=body.kind,
            body=_compose_limit_body(body.label, body.notes),
            severity=body.severity,
        )
        return _to_limit_out(row)

    async def update_own_limit(
        self, sub_id: UUID, limit_id: UUID, patch: SubLimitUpdate
    ) -> SubLimitOut:
        """Edit a limit owned by the calling sub; any change clears goddess acknowledgement."""
        existing = await self._limits.get(limit_id)
        if existing.sub_id != sub_id:
            raise NotFound(f"sub_limit {limit_id} not found")

        new_label = patch.label if patch.label is not None else existing.body.split("\n\n", 1)[0]
        existing_notes = existing.body.split("\n\n", 1)[1] if "\n\n" in existing.body else None
        new_notes = patch.notes if patch.notes is not None else existing_notes
        new_body = _compose_limit_body(new_label, new_notes)

        row = await self._limits.update(
            limit_id,
            kind=patch.kind,
            body=new_body,
            severity=patch.severity,
            clear_acknowledgement=True,
        )
        return _to_limit_out(row)

    async def delete_own_limit(self, sub_id: UUID, limit_id: UUID) -> None:
        """Delete a limit owned by the calling sub."""
        existing = await self._limits.get(limit_id)
        if existing.sub_id != sub_id:
            raise NotFound(f"sub_limit {limit_id} not found")
        await self._limits.delete(limit_id)

    async def list_sub_limits_for_goddess(
        self, goddess_user_id: UUID, sub_id: UUID
    ) -> list[SubLimitOut]:
        """Return every limit for the given sub, enforcing goddess ownership."""
        await self._assert_sub_under_goddess(goddess_user_id, sub_id)
        rows = await self._limits.list_by_sub(sub_id)
        return [_to_limit_out(row) for row in rows]

    async def acknowledge_limit(
        self, goddess_user_id: UUID, sub_id: UUID, limit_id: UUID
    ) -> SubLimitOut:
        """Idempotently stamp acknowledged_by_goddess_at; no-op if already acknowledged."""
        await self._assert_sub_under_goddess(goddess_user_id, sub_id)
        goddess_id = await self._resolve_goddess_id(goddess_user_id)
        existing = await self._limits.get(limit_id)
        if existing.sub_id != sub_id:
            raise NotFound(f"sub_limit {limit_id} not found")
        if existing.goddess_id != goddess_id:
            raise Forbidden("limit does not belong to this goddess")
        if existing.acknowledged_by_goddess_at is not None:
            return _to_limit_out(existing)
        row = await self._limits.acknowledge(limit_id, goddess_id)
        return _to_limit_out(row)

    async def list_own_triggers(self, sub_id: UUID) -> list[SubTriggerOut]:
        """Return every trigger owned by the calling sub, newest first."""
        rows = await self._triggers.list_by_sub(sub_id)
        return [_to_trigger_out(row) for row in rows]

    async def create_own_trigger(self, sub_id: UUID, body: SubTriggerCreate) -> SubTriggerOut:
        """Create a trigger row for the calling sub."""
        goddess_id = await self._require_sub_goddess(sub_id)
        row = await self._triggers.create(
            sub_id=sub_id,
            goddess_id=goddess_id,
            trigger_text=body.trigger_text,
            severity=body.severity,
            notes=body.notes,
        )
        return _to_trigger_out(row)

    async def update_own_trigger(
        self, sub_id: UUID, trigger_id: UUID, patch: SubTriggerUpdate
    ) -> SubTriggerOut:
        """Edit a trigger owned by the calling sub."""
        existing = await self._triggers.get(trigger_id)
        if existing.sub_id != sub_id:
            raise NotFound(f"sub_trigger {trigger_id} not found")
        row = await self._triggers.update(
            trigger_id,
            trigger_text=patch.trigger_text,
            notes=patch.notes,
            severity=patch.severity,
        )
        return _to_trigger_out(row)

    async def delete_own_trigger(self, sub_id: UUID, trigger_id: UUID) -> None:
        """Delete a trigger owned by the calling sub."""
        existing = await self._triggers.get(trigger_id)
        if existing.sub_id != sub_id:
            raise NotFound(f"sub_trigger {trigger_id} not found")
        await self._triggers.delete(trigger_id)

    async def list_sub_triggers_for_goddess(
        self, goddess_user_id: UUID, sub_id: UUID
    ) -> list[SubTriggerOut]:
        """Return every trigger for the given sub, enforcing goddess ownership."""
        await self._assert_sub_under_goddess(goddess_user_id, sub_id)
        rows = await self._triggers.list_by_sub(sub_id)
        return [_to_trigger_out(row) for row in rows]
