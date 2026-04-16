import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, or_, select

from core.exceptions import NotFound
from models.task import Task, TaskStatus


class TaskDao:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, task: Task) -> Task:
        """Persist a new task and return it with its database-assigned id."""
        self._session.add(task)
        await self._session.flush()
        return task

    async def get_by_id(self, task_id: UUID) -> Task:
        """Return a task by id, raising NotFound if absent."""
        row = await self._session.get(Task, task_id)
        if row is None:
            raise NotFound(f"task {task_id} not found")
        return row

    async def list_by_sub(self, sub_id: UUID) -> list[Task]:
        """Return all tasks for a sub, newest first."""
        result = await self._session.execute(
            select(Task).where(col(Task.sub_id) == sub_id).order_by(col(Task.created_at).desc())
        )
        return list(result.scalars().all())

    async def list_open_or_submitted_for_sub(self, sub_id: UUID) -> list[Task]:
        """Return open and submitted tasks for a sub, newest first."""
        result = await self._session.execute(
            select(Task)
            .where(
                col(Task.sub_id) == sub_id,
                or_(
                    col(Task.status) == TaskStatus.open,
                    col(Task.status) == TaskStatus.submitted,
                ),
            )
            .order_by(col(Task.created_at).desc())
        )
        return list(result.scalars().all())

    async def update(self, task: Task, **fields: object) -> Task:
        """Apply arbitrary field updates to an existing task row."""
        for key, value in fields.items():
            setattr(task, key, value)
        task.updated_at = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
        self._session.add(task)
        await self._session.flush()
        return task

    async def delete(self, task_id: UUID) -> None:
        """Hard-delete a task row, raising NotFound if absent."""
        task = await self.get_by_id(task_id)
        await self._session.delete(task)
        await self._session.flush()
