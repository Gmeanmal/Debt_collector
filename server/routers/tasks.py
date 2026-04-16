from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.task_controller import TaskController
from core.db import get_session
from dependencies.auth import require_role
from models.user import User, UserRole
from schemas.tasks import (
    TaskCreateIn,
    TaskOut,
    TaskRejectIn,
    TaskSubmitIn,
    TaskUpdateIn,
)

_E400 = {"description": "Bad request — invalid payload or business rule violation"}
_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — role or ownership mismatch"}
_E404 = {"description": "Not found — task or sub does not exist"}
_E409 = {"description": "Conflict — illegal status transition"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}

goddess_router = APIRouter(tags=["tasks"])
sub_router = APIRouter(tags=["tasks"])


def _ctrl(session: AsyncSession = Depends(get_session)) -> TaskController:
    return TaskController(session)


# ---------------------------------------------------------------------------
# Goddess — task management
# ---------------------------------------------------------------------------


@goddess_router.post(
    "/goddess/subs/{sub_id}/tasks",
    summary="Create a task for a sub",
    description=(
        "Creates a one-off task assigned to the given sub. "
        "The sub must belong to the authenticated goddess. "
        "The task starts in `open` status."
    ),
    response_model=TaskOut,
    status_code=201,
    tags=["tasks"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 422: _E422},
)
async def create_task(
    sub_id: UUID,
    body: TaskCreateIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: TaskController = Depends(_ctrl),
) -> TaskOut:
    result = await ctrl.create_task(user, sub_id, body)
    await session.commit()
    return result


@goddess_router.get(
    "/goddess/subs/{sub_id}/tasks",
    summary="List a sub's tasks",
    description=(
        "Returns all tasks assigned to the given sub regardless of status. "
        "The sub must belong to the authenticated goddess."
    ),
    response_model=list[TaskOut],
    status_code=200,
    tags=["tasks"],
    responses={401: _E401, 403: _E403, 404: _E404},
)
async def list_tasks_for_sub(
    sub_id: UUID,
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: TaskController = Depends(_ctrl),
) -> list[TaskOut]:
    return await ctrl.list_tasks_for_sub(user, sub_id)


@goddess_router.patch(
    "/goddess/tasks/{task_id}",
    summary="Partially update a task",
    description=(
        "Updates mutable fields on an `open` task owned by the authenticated goddess. "
        "Only supplied fields are changed. Returns 409 if the task is not in `open` status."
    ),
    response_model=TaskOut,
    status_code=200,
    tags=["tasks"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422},
)
async def update_task(
    task_id: UUID,
    body: TaskUpdateIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: TaskController = Depends(_ctrl),
) -> TaskOut:
    result = await ctrl.update_task(user, task_id, body)
    await session.commit()
    return result


@goddess_router.post(
    "/goddess/tasks/{task_id}/cancel",
    summary="Cancel an open task",
    description=(
        "Transitions an `open` task to `cancelled`. "
        "Returns 409 if the task is not in `open` status."
    ),
    response_model=TaskOut,
    status_code=200,
    tags=["tasks"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409},
)
async def cancel_task(
    task_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: TaskController = Depends(_ctrl),
) -> TaskOut:
    result = await ctrl.cancel_task(user, task_id)
    await session.commit()
    return result


@goddess_router.post(
    "/goddess/tasks/{task_id}/approve",
    summary="Approve a submitted task",
    description=(
        "Transitions a `submitted` task to `approved`. "
        "Returns 409 if the task is not in `submitted` status."
    ),
    response_model=TaskOut,
    status_code=200,
    tags=["tasks"],
    responses={401: _E401, 403: _E403, 404: _E404, 409: _E409},
)
async def approve_task(
    task_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: TaskController = Depends(_ctrl),
) -> TaskOut:
    result = await ctrl.approve_task(user, task_id)
    await session.commit()
    return result


@goddess_router.post(
    "/goddess/tasks/{task_id}/reject",
    summary="Reject a submitted task",
    description=(
        "Transitions a `submitted` task to `rejected`. "
        "An optional `reason` is stored on the task and visible to the sub. "
        "Returns 409 if the task is not in `submitted` status."
    ),
    response_model=TaskOut,
    status_code=200,
    tags=["tasks"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422},
)
async def reject_task(
    task_id: UUID,
    body: TaskRejectIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.goddess)),
    ctrl: TaskController = Depends(_ctrl),
) -> TaskOut:
    result = await ctrl.reject_task(user, task_id, body)
    await session.commit()
    return result


# ---------------------------------------------------------------------------
# Sub — own tasks
# ---------------------------------------------------------------------------


@sub_router.get(
    "/sub/tasks",
    summary="List own open and submitted tasks",
    description=(
        "Returns the authenticated sub's tasks that are in `open` or `submitted` status. "
        "Approved, rejected, and cancelled tasks are excluded."
    ),
    response_model=list[TaskOut],
    status_code=200,
    tags=["tasks"],
    responses={401: _E401, 403: _E403},
)
async def list_own_tasks(
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: TaskController = Depends(_ctrl),
) -> list[TaskOut]:
    return await ctrl.list_own_tasks(user)


@sub_router.post(
    "/sub/tasks/{task_id}/submit",
    summary="Submit a task for goddess review",
    description=(
        "Transitions an `open` task to `submitted`. "
        "Optionally accepts a note and/or an evidence R2 key (B4 wires actual upload). "
        "Returns 409 if the task is not in `open` status."
    ),
    response_model=TaskOut,
    status_code=200,
    tags=["tasks"],
    responses={400: _E400, 401: _E401, 403: _E403, 404: _E404, 409: _E409, 422: _E422},
)
async def submit_task(
    task_id: UUID,
    body: TaskSubmitIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_role(UserRole.sub)),
    ctrl: TaskController = Depends(_ctrl),
) -> TaskOut:
    result = await ctrl.submit_task(user, task_id, body)
    await session.commit()
    return result
