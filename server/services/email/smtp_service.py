from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib


class SmtpEmailService:
    def __init__(self, host: str, port: int, mail_from: str) -> None:
        self._host = host
        self._port = port
        self._mail_from = mail_from

    async def send(self, to: str, subject: str, html: str, text: str | None = None) -> None:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = self._mail_from
        message["To"] = to

        if text:
            message.attach(MIMEText(text, "plain"))
        message.attach(MIMEText(html, "html"))

        await aiosmtplib.send(message, hostname=self._host, port=self._port)
