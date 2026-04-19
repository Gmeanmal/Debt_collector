import asyncio
import time
from uuid import UUID

import structlog
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from core.exceptions import Unauthorized
from core.security import decode_access_token
from services.notifications.publisher import publisher

log = structlog.get_logger()

router = APIRouter()

_PING_INTERVAL_S = 20
_PONG_TIMEOUT_S = 30


@router.websocket("/ws/notifications")
async def notifications_ws(ws: WebSocket, token: str = Query(...)) -> None:
    """WebSocket stream of notifications for the authenticated user.

    Auth: JWT access token passed as `?token=...` query param (no Authorization
    header in browsers for WS). Close code 4401 on bad/missing token.

    Every frame is a JSON envelope ``{"type": "<kind>", "data": {...}}``.
    The server sends ``{"type": "ping", "ts": <epoch_ms>}`` every 20 s.
    Clients must reply ``{"type": "pong"}``; connections without a pong
    within 30 s are closed with code 1001.
    """
    try:
        data = decode_access_token(token)
        user_id = UUID(data["sub"])
    except (Unauthorized, ValueError, KeyError):
        await ws.close(code=4401)
        return

    await ws.accept()
    q = await publisher.subscribe(user_id)

    # Grace: treat connection time as first implicit pong so the first real
    # pong deadline is 30 s after accept, not 30 s from the first ping.
    last_pong_monotonic = time.monotonic()
    disconnected = False

    async def receiver() -> None:
        nonlocal last_pong_monotonic, disconnected
        try:
            while True:
                msg = await ws.receive_json()
                if isinstance(msg, dict) and msg.get("type") == "pong":
                    last_pong_monotonic = time.monotonic()
        except WebSocketDisconnect:
            disconnected = True

    async def pinger() -> None:
        while True:
            await asyncio.sleep(_PING_INTERVAL_S)
            if time.monotonic() - last_pong_monotonic > _PONG_TIMEOUT_S:
                log.warning("ws_heartbeat_timeout", user_id=str(user_id))
                await ws.close(code=1001)
                return
            await ws.send_json({"type": "ping", "ts": int(time.time() * 1000)})

    async def publisher_relay() -> None:
        while not disconnected:
            payload = await q.get()
            await ws.send_json(payload)

    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(receiver())
            tg.create_task(pinger())
            tg.create_task(publisher_relay())
    except* (WebSocketDisconnect, Exception):
        pass
    finally:
        await publisher.unsubscribe(user_id, q)
