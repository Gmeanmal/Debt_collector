from typing import Any

import httpx

from core.exceptions import AppError


class ResendEmailService:
    def __init__(self, api_key: str, mail_from: str) -> None:
        self._api_key = api_key
        self._mail_from = mail_from

    async def send(self, to: str, subject: str, html: str, text: str | None = None) -> None:
        if not self._api_key:
            raise AppError("RESEND_API_KEY is not configured")

        payload: dict[str, Any] = {
            "from": self._mail_from,
            "to": to,
            "subject": subject,
            "html": html,
        }
        if text:
            payload["text"] = text

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json=payload,
                timeout=10,
            )
            response.raise_for_status()
