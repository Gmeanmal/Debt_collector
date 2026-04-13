from typing import Protocol


class EmailService(Protocol):
    async def send(self, to: str, subject: str, html: str, text: str | None = None) -> None: ...
