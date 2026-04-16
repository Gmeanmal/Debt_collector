from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from core.config import get_settings
from core.db import engine
from core.exception_handlers import register as register_exception_handlers
from core.logging import configure_logging
from core.rate_limit import limiter, rate_limit_exceeded_handler
from middleware.request_id import RequestIdMiddleware
from middleware.security_headers import SecurityHeadersMiddleware
from routers import (
    adjustments,
    admin,
    admin_cron,
    auth,
    blacklist,
    consent,
    dashboards,
    debt_contracts,
    goddess_profile,
    goddess_views,
    health,
    invitations,
    journal,
    kinks,
    limits,
    me_preferences,
    merits,
    notifications,
    panic,
    payment_methods,
    penalty_rules,
    profile,
    public_invitation,
    rituals,
    rolling,
    safeword,
    signup,
    tasks,
    toys,
    tribute_minimum,
    ws,
)
from routers.payments import (
    goddess_router as payments_goddess_router,
)
from routers.payments import (
    goddess_subs_router,
)
from routers.payments import (
    sub_methods_router as sub_payment_methods_router,
)
from routers.payments import (
    sub_router as payments_sub_router,
)
from workers.daily_cron import start_scheduler


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    settings = get_settings()
    scheduler = start_scheduler() if settings.cron_enabled else None
    try:
        yield
    finally:
        if scheduler is not None:
            scheduler.shutdown(wait=False)
        await engine.dispose()


_settings = get_settings()

app = FastAPI(
    title="Debt Collector API",
    version="0.1.0",
    lifespan=lifespan,
    openapi_url=None if _settings.is_prod else "/openapi.json",
    docs_url=None if _settings.is_prod else "/docs",
    redoc_url=None if _settings.is_prod else "/redoc",
)

app.state.limiter = limiter

if _settings.rate_limit_enabled:
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.add_middleware(
    SecurityHeadersMiddleware,
    enable_hsts=_settings.security_hsts_enabled,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins_list,
    allow_origin_regex=_settings.cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Confirm-Password"],
)
# Added last so it runs first on ingress — request_id is available to all inner middleware.
app.add_middleware(RequestIdMiddleware)

register_exception_handlers(app)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(invitations.router)
app.include_router(payment_methods.router)
app.include_router(public_invitation.router)
app.include_router(signup.router)
app.include_router(payments_sub_router)
app.include_router(sub_payment_methods_router)
app.include_router(payments_goddess_router)
app.include_router(goddess_subs_router)
app.include_router(rolling.router)
app.include_router(debt_contracts.router)
app.include_router(blacklist.router)
app.include_router(adjustments.router)
app.include_router(admin_cron.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(me_preferences.router)
app.include_router(profile.router)
app.include_router(goddess_profile.router)
app.include_router(dashboards.goddess_router)
app.include_router(dashboards.sub_router)
app.include_router(goddess_views.router)
app.include_router(safeword.router)
app.include_router(panic.router)
app.include_router(journal.router)
app.include_router(kinks.router)
app.include_router(limits.router)
app.include_router(tribute_minimum.goddess_router)
app.include_router(toys.goddess_router)
app.include_router(toys.sub_router)
app.include_router(rituals.goddess_router)
app.include_router(rituals.sub_router)
app.include_router(tasks.goddess_router)
app.include_router(tasks.sub_router)
app.include_router(merits.router)
app.include_router(consent.router)
app.include_router(penalty_rules.router)
app.include_router(ws.router)
