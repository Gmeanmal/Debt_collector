import asyncio
import json
from typing import Any

import structlog

# WHY: pywebpush ships no type stubs; import is untyped upstream.
from pywebpush import WebPushException, webpush  # type: ignore[import-untyped]

from core.config import Settings
from models.push_subscription import PushSubscription

log = structlog.get_logger()

_GONE_STATUS = {404, 410}


class PushSender:
    """Thin wrapper around pywebpush keyed by settings. No-op when VAPID keys are absent."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def send(self, sub: PushSubscription, payload: dict[str, Any]) -> bool:
        """Send payload to a single subscription.

        Returns False if the endpoint is permanently gone (HTTP 404 / 410) so the caller
        can prune. Returns True on success or on any transient failure (which is logged).
        """
        if self._settings.vapid_private_key == "":
            return True

        try:
            await asyncio.to_thread(
                webpush,
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=json.dumps(payload),
                vapid_private_key=self._settings.vapid_private_key,
                vapid_claims={"sub": self._settings.vapid_subject},
            )
            return True
        except WebPushException as exc:
            status: int | None = None
            if exc.response is not None:
                status = getattr(exc.response, "status_code", None)
            if status in _GONE_STATUS:
                return False
            log.warning(
                "push_send_failed",
                endpoint=sub.endpoint,
                status=status,
                message=str(exc),
            )
            return True
