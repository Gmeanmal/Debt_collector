import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from controllers._goddess import resolve_goddess_id
from controllers.ritual_controller import RitualController
from controllers.task_controller import TaskController
from core.exceptions import AppError
from daos.review_queue_dao import ReviewQueueDao
from models.user import User
from schemas.review_queue import (
    BulkAction,
    BulkActionIn,
    BulkActionOut,
    BulkItemFailure,
    BulkItemRef,
    BulkItemResult,
    ReviewItemKind,
    ReviewQueueItemOut,
)
from schemas.rituals import OccurrenceRejectIn
from schemas.tasks import TaskRejectIn
from services.storage.object_store import generate_presigned_url


class ReviewQueueController:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._dao = ReviewQueueDao(session)
        self._ritual_ctrl = RitualController(session)
        self._task_ctrl = TaskController(session)

    async def list_review_queue(
        self,
        goddess_user: User,
        *,
        limit: int = 50,
        before: datetime.datetime | None = None,
    ) -> list[ReviewQueueItemOut]:
        """Return a merged, newest-first queue of submitted occurrences and tasks."""
        goddess_id = await resolve_goddess_id(self._session, goddess_user.id)

        occurrence_rows = await self._dao.list_submitted_occurrences_for_goddess(
            goddess_id, before=before, limit=limit
        )
        task_rows = await self._dao.list_submitted_tasks_for_goddess(
            goddess_id, before=before, limit=limit
        )

        items: list[ReviewQueueItemOut] = []

        for occ, ritual, sub in occurrence_rows:
            submitted_at = occ.completed_at or occ.created_at
            presigned = await _maybe_presign(occ.evidence_r2_key)
            items.append(
                ReviewQueueItemOut(
                    kind=ReviewItemKind.ritual_occurrence,
                    id=occ.id,
                    sub_id=sub.id,
                    sub_username=sub.username,
                    sub_display_name=sub.first_name,
                    title=ritual.title,
                    submitted_at=submitted_at,
                    evidence_r2_key=occ.evidence_r2_key,
                    evidence_presigned_url=presigned,
                    note=occ.note,
                    points_on_complete=ritual.points_on_complete,
                )
            )

        for task, sub in task_rows:
            submitted_at = task.submitted_at or task.created_at
            presigned = await _maybe_presign(task.evidence_r2_key)
            items.append(
                ReviewQueueItemOut(
                    kind=ReviewItemKind.task,
                    id=task.id,
                    sub_id=sub.id,
                    sub_username=sub.username,
                    sub_display_name=sub.first_name,
                    title=task.title,
                    submitted_at=submitted_at,
                    evidence_r2_key=task.evidence_r2_key,
                    evidence_presigned_url=presigned,
                    note=task.note,
                    points_on_complete=task.points_on_complete,
                )
            )

        items.sort(key=lambda x: x.submitted_at, reverse=True)
        return items[:limit]

    async def bulk_action(self, goddess_user: User, body: BulkActionIn) -> BulkActionOut:
        """Approve or reject a batch of items, returning partial success results.

        Each item is processed independently. Domain errors are caught per-item
        and added to the failed list; already-processed items are not rolled back.
        A single commit is issued after all items are processed.
        """
        succeeded: list[BulkItemResult] = []
        failed: list[BulkItemFailure] = []

        for ref in body.items:
            try:
                await _dispatch(
                    self._ritual_ctrl,
                    self._task_ctrl,
                    goddess_user,
                    body.action,
                    ref,
                    body.reason,
                )
                succeeded.append(BulkItemResult(kind=ref.kind, id=ref.id))
            except AppError as exc:
                failed.append(BulkItemFailure(kind=ref.kind, id=ref.id, error=str(exc)))
            except Exception as exc:
                failed.append(BulkItemFailure(kind=ref.kind, id=ref.id, error=str(exc)))

        return BulkActionOut(succeeded=succeeded, failed=failed)


async def _maybe_presign(key: str | None) -> str | None:
    if not key:
        return None
    try:
        from core.config import get_settings

        settings = get_settings()
        return await generate_presigned_url(settings.s3_bucket_sub_photos, key)
    except Exception:
        return None


async def _dispatch(
    ritual_ctrl: RitualController,
    task_ctrl: TaskController,
    goddess_user: User,
    action: BulkAction,
    ref: BulkItemRef,
    reason: str | None,
) -> None:
    if ref.kind == ReviewItemKind.ritual_occurrence:
        if action == BulkAction.approve:
            await ritual_ctrl.approve_occurrence(goddess_user, ref.id)
        else:
            await ritual_ctrl.reject_occurrence(
                goddess_user, ref.id, OccurrenceRejectIn(reason=reason)
            )
    else:
        if action == BulkAction.approve:
            await task_ctrl.approve_task(goddess_user, ref.id)
        else:
            await task_ctrl.reject_task(goddess_user, ref.id, TaskRejectIn(reason=reason))
