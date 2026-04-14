import asyncio
from collections import defaultdict
from typing import Any, Protocol
from uuid import UUID

import structlog

log = structlog.get_logger()


class NotificationPublisher(Protocol):
    async def publish(self, user_id: UUID, payload: dict[str, Any]) -> None: ...
    async def subscribe(self, user_id: UUID) -> asyncio.Queue[dict[str, Any]]: ...
    async def unsubscribe(self, user_id: UUID, q: asyncio.Queue[dict[str, Any]]) -> None: ...


class InProcessPublisher:
    def __init__(self) -> None:
        self._subs: dict[UUID, list[asyncio.Queue[dict[str, Any]]]] = defaultdict(list)

    async def publish(self, user_id: UUID, payload: dict[str, Any]) -> None:
        for q in list(self._subs.get(user_id, [])):
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                log.warning(
                    "notification_queue_full",
                    user_id=str(user_id),
                    dropped_type=payload.get("type"),
                )

    async def subscribe(self, user_id: UUID) -> asyncio.Queue[dict[str, Any]]:
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=32)
        self._subs[user_id].append(q)
        return q

    async def unsubscribe(self, user_id: UUID, q: asyncio.Queue[dict[str, Any]]) -> None:
        queues = self._subs.get(user_id)
        if queues is not None and q in queues:
            queues.remove(q)
            if not queues:
                self._subs.pop(user_id, None)


publisher: NotificationPublisher = InProcessPublisher()
