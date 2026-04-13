---
name: external-service-adapter
description: Use when implementing anything that talks to an external system — email, object storage, SMS, image resizer, captcha, payment webhook verifier, any third-party API. Enforces the Handler + Provider + Protocol pattern so the code never imports a vendor SDK outside the providers folder.
---

# External Service Adapter Pattern

Every external system the backend talks to is accessed through **one Handler class** initialized once at app startup with a provider dependency injected. The rest of the app imports the handler and calls its methods — it never knows which vendor is behind it.

This is not a style preference. It is a hard architectural rule.

## Why

- The code must not have to change when ops picks a different vendor
- Dev must be able to run the full app offline with a local/fake provider
- Tests must inject a recording fake instead of mocking Handler internals
- Vendor lock-in is delayed to the operator, not the developer

## The four pieces

### 1. Protocol

A `typing.Protocol` describing the minimum operations the Handler needs from the outside world.

```python
# backend/services/email/provider.py
from typing import Protocol

class EmailProvider(Protocol):
    async def send(
        self,
        to: str,
        subject: str,
        html: str,
        text: str,
        headers: dict[str, str] | None = None,
    ) -> None: ...
```

Protocols, not ABCs. No inheritance chain. Structural typing.

### 2. Concrete providers

One file per vendor under `backend/services/<name>/providers/`. Each provider only knows its own API shape.

```python
# backend/services/email/providers/smtp.py
class SMTPProvider:
    def __init__(self, host: str, port: int, user: str, password: str) -> None: ...
    async def send(self, to, subject, html, text, headers=None) -> None: ...

# backend/services/email/providers/http.py
class HTTPProvider:
    """Generic HTTP API provider — works with Resend / Postmark / SES / Mailgun."""
    def __init__(self, endpoint: str, api_key: str, from_address: str) -> None: ...
    async def send(self, to, subject, html, text, headers=None) -> None: ...

# backend/services/email/providers/console.py
class ConsoleProvider:
    """Dev-only. Writes .eml files to backend/tmp/emails/."""
    async def send(self, to, subject, html, text, headers=None) -> None: ...
```

**Vendor SDK imports live only in this folder.** `import boto3`, `from resend import ...`, `import aiosmtplib` — only in `providers/`.

### 3. The Handler

One class per external concern. Takes a provider in `__init__`, exposes the public methods the app uses, adds cross-provider concerns (retries, logging, audit hooks, rate limits).

```python
# backend/services/email/handler.py
class EmailHandler:
    def __init__(self, provider: EmailProvider, default_from: str) -> None:
        self._provider = provider
        self._default_from = default_from

    async def send(
        self,
        to: str,
        subject: str,
        html: str,
        text: str,
        headers: dict[str, str] | None = None,
    ) -> None:
        merged = {"From": self._default_from, **(headers or {})}
        await self._provider.send(to, subject, html, text, merged)
```

Handlers may add retries, circuit breakers, audit events, schema validation, rate-limit back-pressure, template rendering — anything that is not vendor-specific. Vendor-specific work is the provider's job.

### 4. Runtime wiring

Pick the provider in `core/config.py` based on env vars, instantiate the handler once in FastAPI's lifespan, expose via DI.

```python
# backend/core/config.py
class Settings(BaseSettings):
    email_provider: Literal["smtp", "http", "console"] = "console"
    email_from: str = "no-reply@localhost"
    email_smtp_host: str | None = None
    email_smtp_port: int = 587
    email_smtp_user: str | None = None
    email_smtp_password: str | None = None
    email_api_url: str | None = None
    email_api_key: str | None = None

# backend/services/email/factory.py
def build_email_provider(settings: Settings) -> EmailProvider:
    match settings.email_provider:
        case "smtp":
            return SMTPProvider(
                host=settings.email_smtp_host,
                port=settings.email_smtp_port,
                user=settings.email_smtp_user,
                password=settings.email_smtp_password,
            )
        case "http":
            return HTTPProvider(
                endpoint=settings.email_api_url,
                api_key=settings.email_api_key,
                from_address=settings.email_from,
            )
        case "console":
            return ConsoleProvider()

# backend/main.py
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    provider = build_email_provider(settings)
    app.state.email_handler = EmailHandler(provider, settings.email_from)
    yield

# backend/dependencies/services.py
def get_email_handler(request: Request) -> EmailHandler:
    return request.app.state.email_handler
```

Controllers take the handler via constructor (same pattern as DAOs):

```python
class AuthController:
    def __init__(self, user_dao: UserDAO, email: EmailHandler) -> None:
        self._users = user_dao
        self._email = email

    async def request_password_reset(self, email_addr: str) -> None:
        ...
        await self._email.send(to=..., subject=..., html=..., text=...)
```

## The hard rules

1. **No vendor SDK import outside `backend/services/<name>/providers/`.** `import boto3` in a router is a critical review finding.
2. **One Handler per external concern.** Not one per vendor.
3. **Handler is a singleton** — instantiated once at app startup, held on `app.state`, exposed via a FastAPI dependency. Never instantiated per-request.
4. **Provider is picked in `core/config.py`** based on env var. Nowhere else.
5. **Dev always has a local/offline provider** — `ConsoleProvider` for email, `LocalFSProvider` for storage. `pnpm dev` + `uv run uvicorn main:app --reload` must work without network to any third party.
6. **Tests inject a recording fake provider.** The Handler is real. Only the provider is a fake. Fakes live under `backend/tests/fakes/providers/<name>.py`.

## Testing an adapter

```python
# backend/tests/fakes/providers/email.py
class RecordingEmailProvider:
    def __init__(self) -> None:
        self.sent: list[tuple[str, str, str, str, dict[str, str]]] = []

    async def send(self, to, subject, html, text, headers=None) -> None:
        self.sent.append((to, subject, html, text, headers or {}))


# backend/tests/unit/controllers/test_auth_controller.py
async def test_password_reset_sends_email(session: AsyncSession) -> None:
    user = await insert_user(session, email="sub@example.com")
    emails = RecordingEmailProvider()
    handler = EmailHandler(emails, default_from="no-reply@test.local")
    controller = AuthController(UserDAO(session), handler)

    await controller.request_password_reset("sub@example.com")

    assert len(emails.sent) == 1
    to, subject, _, _, _ = emails.sent[0]
    assert to == "sub@example.com"
    assert "password" in subject.lower()
```

Never mock `EmailHandler` itself. Always substitute at the provider boundary.

## Where to apply this pattern

- `EmailHandler` — transactional email
- `StorageHandler` — object storage (avatars, GDPR exports)
- Any future integration: SMS, captcha, image resizer, payment webhook verifier, antivirus scanner, PII redactor, push notifications

## Where NOT to apply this pattern

- **Database.** SQLModel + Neon/local Postgres already speak the same SQL. DAOs are the abstraction.
- **Redis for rate limits.** `core/ratelimit.py` already has an in-memory fallback for dev; the interface is tight enough that a full Handler+Provider split is over-engineering.
- **WebSocket dispatch.** In-process, no external vendor.

## What never to do

- Never import a vendor SDK outside `services/<name>/providers/`
- Never instantiate a Handler per-request — it is a singleton
- Never mock the Handler in tests — always substitute the provider
- Never add a Handler method that only one provider can implement (leaking vendor specifics)
- Never skip the local/offline provider — dev must work without network
