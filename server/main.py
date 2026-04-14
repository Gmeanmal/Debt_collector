from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from core.db import engine
from core.exception_handlers import register as register_exception_handlers
from core.logging import configure_logging
from routers import (
    adjustments,
    admin_cron,
    auth,
    blacklist,
    dashboards,
    debt_contracts,
    health,
    invitations,
    me_preferences,
    notifications,
    payment_methods,
    public_invitation,
    rolling,
    signup,
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
    configure_logging(dev=True)
    settings = get_settings()
    scheduler = start_scheduler() if settings.cron_enabled else None
    try:
        yield
    finally:
        if scheduler is not None:
            scheduler.shutdown(wait=False)
        await engine.dispose()


app = FastAPI(title="Debt Collector API", version="0.1.0", lifespan=lifespan)

_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
app.include_router(notifications.router)
app.include_router(me_preferences.router)
app.include_router(dashboards.goddess_router)
app.include_router(dashboards.sub_router)
app.include_router(ws.router)
