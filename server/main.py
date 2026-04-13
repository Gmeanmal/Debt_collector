from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from core.db import engine
from core.exception_handlers import register as register_exception_handlers
from core.logging import configure_logging
from routers import health


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging(dev=True)
    yield
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
