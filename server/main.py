"""Main FastAPI application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .core.config import get_settings
from .db.session import init_db
from .routers import api_router
from .services.r2_service import get_r2_service  # ← New import


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings = get_settings()
    print(f"🚀 Starting Debt Collector - {settings.app_env.upper()} mode")
    
    await init_db()
    
    # Test R2 connection (non-blocking)
    try:
        r2 = get_r2_service()
        if r2.client:
            print("✅ R2 storage connected")
        else:
            print("⚠️  R2 not configured (optional)")
    except Exception as e:
        print(f"⚠️  R2 init warning: {e}")
    
    yield
    # Shutdown
    print("👋 Shutting down Debt Collector")


app = FastAPI(
    title="Debt Collector",
    description="Self-hosted Findom Debt Management Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(api_router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True)
