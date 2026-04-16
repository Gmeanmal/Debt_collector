import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from core.exceptions import Conflict, Forbidden, NotFound
from daos.task_dao import TaskDao
from daos.user_dao import UserDao
from models.penalty_rule import PenaltyTrigger
from models.task import Task, TaskStatus
from models.user import User, UserRole
from schemas.tasks import (
    TaskCreateIn,
    TaskOut,
    TaskRejectIn,
    TaskSubmitIn,
    TaskUpdateIn,
)
from services.merits.credits import record_task_complete
from services.penalty.engine import apply_penalty

_SUBMIT_FROM: frozenset[TaskStatus] = frozenset({TaskStatus.open})
_CANCEL_FROM: frozenset[TaskStatus] = frozenset({TaskStatus.open})
_APPROVE_FROM: frozenset[TaskStatus] = frozenset({TaskStatus.submitted})
_REJECT_FROM: frozenset[TaskStatus] = frozenset({TaskStatus.submitted})
_UPDATE_FROM: frozenset[TaskStatus] = frozenset({TaskStatus.open})


def _to_out(task: Task) -> TaskOut:
    return TaskOut.model_validate(task)


class TaskController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = TaskDao(session)
        self._user_dao = UserDao(session)

    # ------------------------------------------------------------------
    # Goddess — task management
    # ------------------------------------------------------------------

    async def create_task(self, goddess_user: User, sub_id: UUID, payload: TaskCreateIn) -> TaskOut:
        """Create a one-off task assigned to the given sub."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        await self._require_sub_under_goddess(goddess_id, sub_id)
        task = Task(
            sub_id=sub_id,
            goddess_id=goddess_id,
            title=payload.title,
            description=payload.description,
            due_at=payload.due_at,
            points_on_complete=payload.points_on_complete,
            points_on_miss=payload.points_on_miss,
            status=TaskStatus.open,
        )
        created = await self._dao.create(task)
        return _to_out(created)

    async def list_tasks_for_sub(self, goddess_user: User, sub_id: UUID) -> list[TaskOut]:
        """Return all tasks for one of the caller's subs."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        await self._require_sub_under_goddess(goddess_id, sub_id)
        tasks = await self._dao.list_by_sub(sub_id)
        return [_to_out(t) for t in tasks]

    async def update_task(self, goddess_user: User, task_id: UUID, patch: TaskUpdateIn) -> TaskOut:
        """Partially update a task; only allowed while status=open."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        task = await self._require_owned_task(goddess_id, task_id)
        if task.status not in _UPDATE_FROM:
            raise Conflict(f"task cannot be updated in status '{task.status}'; must be 'open'")
        fields = patch.model_dump(exclude_unset=True)
        if not fields:
            return _to_out(task)
        updated = await self._dao.update(task, **fields)
        return _to_out(updated)

    async def cancel_task(self, goddess_user: User, task_id: UUID) -> TaskOut:
        """Cancel an open task."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        task = await self._require_owned_task(goddess_id, task_id)
        if task.status not in _CANCEL_FROM:
            raise Conflict(f"cannot cancel task in status '{task.status}'; must be 'open'")
        updated = await self._dao.update(task, status=TaskStatus.cancelled)
        return _to_out(updated)

    async def approve_task(self, goddess_user: User, task_id: UUID) -> TaskOut:
        """Approve a submitted task and credit merit points."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        task = await self._require_owned_task(goddess_id, task_id)
        if task.status not in _APPROVE_FROM:
            raise Conflict(f"cannot approve task in status '{task.status}'; must be 'submitted'")
        now = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        updated = await self._dao.update(
            task,
            status=TaskStatus.approved,
            reviewed_at=now,
            reviewed_by=goddess_user.id,
        )
        await record_task_complete(self._session, updated)
        return _to_out(updated)

    async def reject_task(self, goddess_user: User, task_id: UUID, body: TaskRejectIn) -> TaskOut:
        """Reject a submitted task and debit merit points."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)
        task = await self._require_owned_task(goddess_id, task_id)
        if task.status not in _REJECT_FROM:
            raise Conflict(f"cannot reject task in status '{task.status}'; must be 'submitted'")
        now = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        updated = await self._dao.update(
            task,
            status=TaskStatus.rejected,
            rejection_reason=body.reason,
            reviewed_at=now,
            reviewed_by=goddess_user.id,
        )
        await apply_penalty(
            self._session,
            goddess_id=updated.goddess_id,
            sub_id=updated.sub_id,
            trigger=PenaltyTrigger.task_missed,
            source_kind="task_miss",
            source_id=updated.id,
            default_delta=updated.points_on_miss,
        )
        return _to_out(updated)

    # ------------------------------------------------------------------
    # Sub — own tasks
    # ------------------------------------------------------------------

    async def list_own_tasks(self, sub_user: User) -> list[TaskOut]:
        """Return open and submitted tasks for the authenticated sub."""
        tasks = await self._dao.list_open_or_submitted_for_sub(sub_user.id)
        return [_to_out(t) for t in tasks]

    async def submit_task(self, sub_user: User, task_id: UUID, body: TaskSubmitIn) -> TaskOut:
        """Submit a task for goddess review, transitioning open → submitted."""
        task = await self._dao.get_by_id(task_id)
        if task.sub_id != sub_user.id:
            raise Forbidden("task does not belong to this sub")
        if task.status not in _SUBMIT_FROM:
            raise Conflict(f"cannot submit task in status '{task.status}'; must be 'open'")
        now = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        updated = await self._dao.update(
            task,
            status=TaskStatus.submitted,
            note=body.note,
            evidence_r2_key=body.evidence_r2_key,
            submitted_at=now,
        )
        return _to_out(updated)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _require_sub_under_goddess(self, goddess_id: UUID, sub_id: UUID) -> User:
        sub = await self._user_dao.get_by_id(sub_id)
        if sub is None or sub.role != UserRole.sub:
            raise NotFound("sub not found")
        if sub.goddess_id != goddess_id:
            raise Forbidden("sub does not belong to this goddess")
        return sub

    async def _require_owned_task(self, goddess_id: UUID, task_id: UUID) -> Task:
        task = await self._dao.get_by_id(task_id)
        if task.goddess_id != goddess_id:
            raise Forbidden("task does not belong to this goddess")
        return task
