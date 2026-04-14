from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from core.exceptions import Unauthorized
from core.security import decode_access_token
from services.notifications.publisher import publisher

router = APIRouter()


@router.websocket("/ws/notifications")
async def notifications_ws(ws: WebSocket, token: str = Query(...)) -> None:
    """WebSocket stream of notifications for the authenticated user.

    Auth: JWT access token passed as `?token=...` query param (no Authorization
    header in browsers for WS). Close code 4401 on bad/missing token.
    """
    try:
        data = decode_access_token(token)
        user_id = UUID(data["sub"])
    except (Unauthorized, ValueError, KeyError):
        await ws.close(code=4401)
        return

    await ws.accept()
    q = await publisher.subscribe(user_id)
    try:
        while True:
            payload = await q.get()
            await ws.send_json(payload)
    except WebSocketDisconnect:
        pass
    finally:
        await publisher.unsubscribe(user_id, q)
