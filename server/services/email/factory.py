from core.config import Settings, get_settings
from services.email.base import EmailService
from services.email.resend_service import ResendEmailService
from services.email.smtp_service import SmtpEmailService


def get_email_service(settings: Settings | None = None) -> EmailService:
    s = settings or get_settings()
    if s.email_driver == "resend":
        return ResendEmailService(api_key=s.resend_api_key, mail_from=s.mail_from)
    return SmtpEmailService(host=s.smtp_host, port=s.smtp_port, mail_from=s.mail_from)
