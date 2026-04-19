from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.notification_controller import NotificationController
from controllers.push_subscription_controller import PushSubscriptionController
from core.db import get_session
from dependencies.auth import get_current_user
from models.user import User
from schemas.notification import (
    NotificationListOut,
    PushSubscriptionIn,
    PushSubscriptionOut,
)

router = APIRouter(prefix="/me/notifications", tags=["notifications"])

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E404 = {"description": "Not found — notification does not exist or belongs to another user"}
_E500 = {"description": "Internal server error"}
_E404_SUB = {
    "description": "Not found — push subscription does not exist or belongs to another user"
}


def _ctrl(session: AsyncSession = Depends(get_session)) -> NotificationController:
    return NotificationController(session)


def _push_ctrl(session: AsyncSession = Depends(get_session)) -> PushSubscriptionController:
    return PushSubscriptionController(session)


@router.get(
    "",
    summary="List recent notifications for the authenticated user",
    description=(
        "Returns the 50 most recent notifications for the authenticated user, newest first, "
        "together with the current unread count. Actor display names and usernames are "
        "resolved in a single bulk query when notifications carry an actor_user_id."
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


@router.post(
    "/read-all",
    summary="Mark all unread notifications as read",
    description=(
        "Marks every unread notification for the authenticated user as read in a single "
        "UPDATE statement. No-op when the user has no unread notifications. "
        "Returns 204 No Content on success."
    ),
    response_class=Response,
    status_code=204,
    tags=["notifications"],
    responses={401: _E401, 500: _E500},
)
async def mark_all_notifications_read(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    ctrl: NotificationController = Depends(_ctrl),
) -> Response:
    await ctrl.mark_all_read(user)
    await session.commit()
    return Response(status_code=204)


@router.post(
    "/subscriptions",
    summary="Register a Web Push subscription for the authenticated user",
    description=(
        "Stores a browser Web Push subscription (endpoint + ECDH keys) so the server can "
        "fan out notifications to this device. If the endpoint is already registered — even "
        "under a different account — ownership is rebound to the caller and the keys / "
        "user-agent are refreshed. The `User-Agent` request header is captured for later "
        "display in the subscriptions list."
    ),
    response_model=PushSubscriptionOut,
    status_code=201,
    tags=["notifications"],
    responses={401: _E401, 500: _E500},
)
async def register_push_subscription(
    body: PushSubscriptionIn,
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    ctrl: PushSubscriptionController = Depends(_push_ctrl),
) -> PushSubscriptionOut:
    ua = request.headers.get("user-agent")
    sub = await ctrl.create(user, body, ua)
    await session.commit()
    return PushSubscriptionOut.model_validate(sub)


@router.get(
    "/subscriptions",
    summary="List the caller's active Web Push subscriptions",
    description=(
        "Returns every push subscription owned by the authenticated user, newest first. "
        "Endpoints and keys are not returned verbatim beyond the opaque endpoint URL — "
        "the payload is meant for the Settings page to show registered devices."
    ),
    response_model=list[PushSubscriptionOut],
    status_code=200,
    tags=["notifications"],
    responses={401: _E401, 500: _E500},
)
async def list_push_subscriptions(
    user: User = Depends(get_current_user),
    ctrl: PushSubscriptionController = Depends(_push_ctrl),
) -> list[PushSubscriptionOut]:
    rows = await ctrl.list_for_user(user)
    return [PushSubscriptionOut.model_validate(r) for r in rows]


@router.delete(
    "/subscriptions/{sub_id}",
    summary="Delete a Web Push subscription owned by the authenticated user",
    description=(
        "Removes the given subscription so the server stops fanning out to that device. "
        "Returns 404 if the subscription does not exist or is owned by a different user — "
        "ownership is scoped per-user and silent no-ops would leak existence."
    ),
    response_class=Response,
    status_code=204,
    tags=["notifications"],
    responses={401: _E401, 404: _E404_SUB, 500: _E500},
)
async def delete_push_subscription(
    sub_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
    ctrl: PushSubscriptionController = Depends(_push_ctrl),
) -> Response:
    await ctrl.delete(user, sub_id)
    await session.commit()
    return Response(status_code=204)
