from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.notification_controller import NotificationController
from core.db import get_session
from core.exceptions import Forbidden, NotFound
from daos.user_dao import UserDao
from dependencies.auth import require_role
from models.notification import NotificationType
from models.user import User, UserRole

_E401 = {"description": "Unauthorized — missing or invalid access token"}
_E403 = {"description": "Forbidden — caller is not a goddess or does not own this sub"}
_E404 = {"description": "Not found — no sub with that username belongs to this goddess"}
_E422 = {"description": "Unprocessable entity — request body validation failed"}

router = APIRouter(prefix="/goddess", tags=["goddess-messages"])


class GoddessMessageIn(BaseModel):
    body: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Message body text sent to the sub (5–500 chars).",
        examples=["Don't forget your tribute is due tomorrow."],
    )


class GoddessMessageOut(BaseModel):
    sent: bool = Field(..., description="True when the message was delivered successfully.")


@router.post(
    "/subs/{username}/message",
    summary="Send a direct message to a sub",
    description=(
        "Goddess sends a short message to one of her subs. "
        "The message is delivered as a `goddess_message` notification which "
        "appears in the sub's notification drawer and over the WebSocket channel. "
        "The sub must belong to the calling goddess."
    ),
    response_model=GoddessMessageOut,
    status_code=200,
    tags=["goddess-messages"],
    responses={
        401: _E401,
        403: _E403,
        404: _E404,
        422: _E422,
    },
)
async def send_message_to_sub(
    username: str,
    body: GoddessMessageIn,
    caller: User = Depends(require_role(UserRole.goddess)),
    session: AsyncSession = Depends(get_session),
) -> GoddessMessageOut:
    """Deliver a goddess_message notification to the target sub."""
    user_dao = UserDao(session)
    sub = await user_dao.get_by_username(username)
    if sub is None or sub.role != UserRole.sub:
        raise NotFound(f"sub @{username} not found")
    if sub.goddess_id is None or sub.goddess_id != caller.goddess_id:
        raise Forbidden("sub does not belong to you")

    ctrl = NotificationController(session)
    await ctrl.create_and_publish(
        user_id=sub.id,
        type=NotificationType.goddess_message,
        title="Message from your goddess",
        body=body.body,
        link=None,
        payload=None,
    )
    await session.commit()
    return GoddessMessageOut(sent=True)
