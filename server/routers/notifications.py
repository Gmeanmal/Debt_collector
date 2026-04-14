from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.notification_controller import NotificationController
from core.db import get_session
from dependencies.auth import get_current_user
from models.user import User
from schemas.notification import NotificationListOut

router = APIRouter(prefix="/me/notifications", tags=["notifications"])

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E404 = {"description": "Not found — notification does not exist or belongs to another user"}
_E500 = {"description": "Internal server error"}


def _ctrl(session: AsyncSession = Depends(get_session)) -> NotificationController:
    return NotificationController(session)


@router.get(
    "",
    summary="List recent notifications for the authenticated user",
    description=(
        "Returns the 50 most recent notifications for the authenticated user, newest first, "
        "together with the current unread count."
    ),
    response_model=NotificationListOut,
    status_code=200,
    tags=["notifications"],
    responses={401: _E401, 500: _E500},
)
async def list_my_notifications(
    user: User = Depends(get_current_user),
    ctrl: NotificationController = Depends(_ctrl),
) -> NotificationListOut:
    return await ctrl.list_recent(user)


@router.post(
    "/{notification_id}/read",
    summary="Mark a notification as read",
    description=(
        "Marks the given notification as read for the authenticated user. "
        "No-op if the notification is already read. Silently no-ops when the notification "
        "does not belong to the caller to avoid leaking existence."
    ),
    response_model=None,
    status_code=204,
    tags=["notifications"],
    responses={401: _E401, 404: _E404, 500: _E500},
)
async def mark_notification_read(
    notification_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    ctrl: NotificationController = Depends(_ctrl),
) -> None:
    await ctrl.mark_read(user, notification_id)
    await session.commit()
