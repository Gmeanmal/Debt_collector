# Debt Collector — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Debt Collector app end-to-end: React 19 + Tailwind frontend, FastAPI + SQLModel + Alembic + Postgres backend, WebSocket notifications, WeasyPrint PDF contracts, R2 storage, Resend email, custom admin console. Deferred: tests (retrofitted at the end), hosting decision.

**Architecture:** Layered backend (`routers → controllers → daos → models`), one-way frontend imports (`components → services/hooks → api`), event-sourced debt balance via `debt_event` ledger, in-process APScheduler daily job, WebSocket push for notifications with in-process publisher (swappable to Redis later).

**Tech Stack:** Python 3.12, FastAPI, SQLModel, asyncpg, Alembic, APScheduler, WeasyPrint, aiobotocore (R2), Resend SDK, argon2-cffi, PyJWT. React 19, TypeScript, Vite, Tailwind 4, TanStack Query, openapi-fetch, Zod, lucide-react. Postgres 16, docker-compose for dev.

**Explicit user instructions (override defaults):**

- **No tests during initial build.** Tests will be retrofitted in phase 10. Do NOT use TDD workflow in phases 1–9.
- **All source code, comments, commits, file names in English.** Design charter + specs already match.
- **GBP (£) everywhere, English only, Europe/London timezone.**
- **Never inline hex colours** — use Tailwind utilities generated from `tokens.css`.
- **300-line limit per React component**, named exports only, one-way imports.

**Design references (single source of truth):**

- `Docs/2026-04-13-debt-app-design.md` — full technical spec
- `Docs/design_charter.md` + `Docs/design_charter.html` — visual system
- `Docs/diagrams.html` — ERD, state machines, permission matrix
- `Docs/use_cases.md` — user journeys (Dom-readable)

---

## Phase Overview

| # | Phase | Outcome |
|---|-------|---------|
| 1 | Foundation & dev env | `docker-compose up` boots Postgres + backend + frontend; `/health` replies OK |
| 2 | Auth & users | Goddess + admin can log in; password reset works via Resend |
| 3 | Invitations & entry tribute | Goddess invites sub → sub signs up → declares entry → activation |
| 4 | Payment methods + declarations | Goddess configures methods; sub declares payments; Goddess validates |
| 5 | Rolling tributes | Attribution, pausing, multiplier computation, sub dashboard badge |
| 6 | Debt contracts & negotiation | Full state machine, simulation, one-round counter-proposal |
| 7 | Signature & PDF | Canvas signature, WeasyPrint PDF, R2 upload, download links |
| 8 | Ledger + cronjob + lifecycle | Debt events, APScheduler, penalties, buyout, breach, blacklist |
| 9 | Notifications + dashboards + admin | WebSocket bell, Goddess/sub dashboards, `/admin` console |
| 10 | Polish + tests retrofit | Empty states, a11y, mobile, pytest + vitest + Playwright |

Each phase ends with a working, commitable milestone. Phases depend in order.

## Phase Gate (run after every phase before opening the next)

Do NOT start phase N+1 until all of these pass. Treat failures as phase-blocking.

- [ ] `pre-commit run --all-files` → clean (ruff, ruff-format, prettier on everything)
- [ ] `cd backend && uv run ruff check . && uv run ruff format --check .` → clean
- [ ] `cd backend && uv run mypy .` → 0 errors (strict from Phase 10 onwards, non-strict before)
- [ ] `cd frontend && pnpm lint && pnpm tsc --noEmit` → clean
- [ ] `cd frontend && pnpm sync-types` → no diff (OpenAPI types match backend)
- [ ] `docker compose up -d && curl http://localhost:8000/health` → 200 OK
- [ ] Backend imports cleanly: `cd backend && uv run python -c "from main import app"` → no error
- [ ] Frontend builds: `cd frontend && pnpm build` → no error
- [ ] Alembic head is current: `cd backend && uv run alembic current` → matches latest migration file; `uv run alembic upgrade head` is a no-op
- [ ] From Phase 2 onwards: manual smoke of the phase's golden path in the browser (login for P2, invite flow for P3, etc.) — document in a one-line commit message
- [ ] Git working tree clean (all changes committed, no stray files)

If any step fails, fix it in a dedicated commit **within the current phase** before moving on.

---

# Phase 1 — Foundation & Development Environment

**Goal:** Monorepo scaffolded, Docker Compose boots the whole stack locally, pre-commit hooks in place, health endpoint green.

**Files created:**

```
/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── .editorconfig
├── README.md
├── .pre-commit-config.yaml
├── CLAUDE.md                    # root project instructions
├── backend/
│   ├── Dockerfile.dev
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── CLAUDE.md
│   ├── main.py                  # FastAPI app + lifespan
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py            # Pydantic Settings
│   │   ├── db.py                # AsyncSession factory
│   │   ├── logging.py           # structlog setup
│   │   ├── exceptions.py        # domain exception hierarchy
│   │   └── exception_handlers.py
│   ├── models/__init__.py
│   ├── daos/__init__.py
│   ├── controllers/__init__.py
│   ├── routers/
│   │   ├── __init__.py
│   │   └── health.py
│   ├── services/__init__.py
│   ├── dependencies/__init__.py
│   ├── middleware/__init__.py
│   ├── workers/__init__.py
│   ├── utils/__init__.py
│   ├── seeds/__init__.py
│   └── alembic/
│       ├── env.py
│       ├── script.py.mako
│       └── versions/
├── frontend/
│   ├── Dockerfile.dev
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── index.html
│   ├── CLAUDE.md
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── styles/
│   │   │   ├── globals.css      # imports tokens.css + @tailwind
│   │   │   └── tokens.css       # copied from design_charter.md
│   │   ├── types/
│   │   │   └── api.generated.ts # generated from /openapi.json
│   │   ├── api/
│   │   │   └── client.ts        # openapi-fetch client
│   │   ├── components/
│   │   │   └── ui/              # design system primitives
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── routes/
│   │   │   └── HealthRoute.tsx
│   │   └── router.tsx
│   └── public/
└── Docs/ (already exists)
```

---

### Task 1.1 — Root repo scaffolding

- [ ] **Step 1:** Initialize git repo and create `.gitignore`:

```bash
cd /home/qbecb1zen/Documents/projects/personal/GMeanMal/Debt_collector
git init
```

Write `.gitignore`:

```
.venv/
__pycache__/
*.pyc
.mypy_cache/
.ruff_cache/
.pytest_cache/
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
.idea/
.vscode/
.coverage
htmlcov/
```

- [ ] **Step 2:** Create `.editorconfig`:

```ini
root = true
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
[*.py]
indent_size = 4
```

- [ ] **Step 3:** Create `.env.example`:

```
# --- Backend ---
DATABASE_URL=postgresql+asyncpg://debt:debt@postgres:5432/debt
JWT_SECRET_KEY=change-me-in-production-use-a-long-random-string
JWT_ACCESS_TTL_MINUTES=15
JWT_REFRESH_TTL_DAYS=30
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=4
CORS_ORIGINS=http://localhost:5173

# --- Resend (password reset only) ---
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@debt-collector.local

# --- R2 (PDFs) ---
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=debt-collector-dev
R2_PUBLIC_URL=https://debt-collector-dev.r2.dev

# --- App ---
APP_URL=http://localhost:5173
APP_TIMEZONE=Europe/London

# --- Admin bootstrap ---
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@debt-collector.local
ADMIN_PASSWORD=change-me
```

- [ ] **Step 4:** Create root `README.md`:

````markdown
# Debt Collector

Private financial-domination tracker for Goddess Mean Mal. See `Docs/` for specs, use cases, design charter, diagrams.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- Admin UI: http://localhost:5173/admin

## Tree

- `backend/` — FastAPI + SQLModel + Alembic + Postgres
- `frontend/` — React + Vite + Tailwind
- `Docs/` — design, use cases, diagrams, plans

See `backend/CLAUDE.md` and `frontend/CLAUDE.md` for stack-specific rules.
````

- [ ] **Step 5:** Commit.

```bash
git add -A
git commit -m "chore: initialize repo with editor and env baseline"
```

---

### Task 1.2 — Backend Python project

- [ ] **Step 1:** Write `backend/pyproject.toml`:

```toml
[project]
name = "debt-collector-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi[standard]>=0.115",
    "uvicorn[standard]>=0.32",
    "sqlmodel>=0.0.22",
    "sqlalchemy[asyncio]>=2.0.35",
    "asyncpg>=0.30",
    "alembic>=1.14",
    "pydantic-settings>=2.6",
    "python-jose[cryptography]>=3.3",
    "argon2-cffi>=23.1",
    "apscheduler>=3.10",
    "structlog>=24.4",
    "resend>=2.5",
    "aiobotocore>=2.15",
    "weasyprint>=63.0",
    "jinja2>=3.1",
    "python-multipart>=0.0.12",
    "httpx>=0.28",
    "websockets>=13.1",
    "tzdata",
]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "B", "SIM", "RUF"]
ignore = ["E501"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
```

- [ ] **Step 2:** Write `backend/Dockerfile.dev`:

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b \
    libfontconfig1 libcairo2 libgdk-pixbuf-2.0-0 shared-mime-info \
    fonts-liberation && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

WORKDIR /app
COPY pyproject.toml ./
RUN uv pip install --system -e .

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

- [ ] **Step 3:** Write `backend/core/config.py`:

```python
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    database_url: str
    jwt_secret_key: str
    jwt_access_ttl_minutes: int = 15
    jwt_refresh_ttl_days: int = 30
    argon2_memory_cost: int = 65536
    argon2_time_cost: int = 3
    argon2_parallelism: int = 4
    cors_origins: str = "http://localhost:5173"

    resend_api_key: str = ""
    resend_from_email: str = "noreply@debt-collector.local"

    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = ""
    r2_public_url: str = ""

    app_url: str = "http://localhost:5173"
    app_timezone: str = "Europe/London"

    admin_username: str = "admin"
    admin_email: str = "admin@debt-collector.local"
    admin_password: str = "change-me"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
```

- [ ] **Step 4:** Write `backend/core/db.py`:

```python
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.config import get_settings

_settings = get_settings()
engine = create_async_engine(_settings.database_url, pool_pre_ping=True, echo=False)
SessionMaker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionMaker() as session:
        yield session
```

- [ ] **Step 5:** Write `backend/core/logging.py`:

```python
import logging
import sys

import structlog


def configure_logging(dev: bool = True) -> None:
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=logging.INFO)
    processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]
    if dev:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))
    else:
        processors.append(structlog.processors.JSONRenderer())
    structlog.configure(processors=processors, wrapper_class=structlog.make_filtering_bound_logger(logging.INFO))
```

- [ ] **Step 6:** Write `backend/core/exceptions.py`:

```python
class DomainError(Exception):
    """Base domain exception."""
    status_code = 400

    def __init__(self, message: str, **context):
        super().__init__(message)
        self.message = message
        self.context = context


class NotFound(DomainError):
    status_code = 404


class Unauthorized(DomainError):
    status_code = 401


class Forbidden(DomainError):
    status_code = 403


class Conflict(DomainError):
    status_code = 409


class ValidationError(DomainError):
    status_code = 422
```

- [ ] **Step 7:** Write `backend/core/exception_handlers.py`:

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from core.exceptions import DomainError


def register(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _handle_domain_error(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.__class__.__name__, "message": exc.message, "context": exc.context},
        )
```

- [ ] **Step 8:** Write `backend/routers/health.py`:

```python
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 9:** Write `backend/main.py`:

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from core.exception_handlers import register as register_exception_handlers
from core.logging import configure_logging
from routers import health


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging(dev=True)
    yield


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
```

- [ ] **Step 10:** Write `backend/alembic.ini` and init Alembic:

```bash
cd backend
alembic init alembic
```

Edit `alembic/env.py` to read `DATABASE_URL` from env and use async engine. Replace the generated `run_migrations_online`:

```python
import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool
from sqlmodel import SQLModel

import models  # noqa: F401 — ensure all models are imported

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])
target_metadata = SQLModel.metadata


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with engine.connect() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


asyncio.run(run_migrations_online())
```

- [ ] **Step 11:** Write `backend/CLAUDE.md` — layer discipline and local conventions. Copy the backend section from `BEST_PRACTICES.md` at repo root, adapting paths.

- [ ] **Step 12:** Commit.

```bash
git add backend/ .gitignore .env.example README.md .editorconfig
git commit -m "feat(backend): scaffold FastAPI app with health endpoint and Alembic"
```

---

### Task 1.3 — Frontend React project

- [ ] **Step 1:** Initialize frontend with Vite:

```bash
cd frontend
pnpm create vite@latest . --template react-ts
pnpm add -D tailwindcss@next @tailwindcss/vite postcss autoprefixer
pnpm add react-router-dom @tanstack/react-query openapi-fetch zod lucide-react clsx
pnpm add -D @types/node eslint prettier eslint-plugin-react-hooks eslint-plugin-react-refresh typescript-eslint
```

- [ ] **Step 2:** Write `frontend/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: "0.0.0.0", port: 5173, strictPort: true },
});
```

- [ ] **Step 3:** Copy tokens into `frontend/src/styles/tokens.css`. Use the full content from `Docs/design_charter.md` section 2, wrapped in `:root { ... }` (dark values as default). Add a `[data-theme="light"] { ... }` block with the light-theme base-surface overrides from charter section 2.7 (accent tokens unchanged). All tokens: base surfaces, pink, violet, gold, crimson (debt), status, radii, shadows, motion.

- [ ] **Step 4:** Write `frontend/src/styles/globals.css`:

```css
@import "tailwindcss";
@import "./tokens.css";

@theme inline {
  --color-base-bg: var(--color-base-bg);
  --color-base-surface: var(--color-base-surface);
  --color-base-surface-raised: var(--color-base-surface-raised);
  --color-base-border: var(--color-base-border);
  --color-base-text: var(--color-base-text);
  --color-base-text-muted: var(--color-base-text-muted);
  --color-base-text-subtle: var(--color-base-text-subtle);
  --color-pink-primary: var(--color-pink-primary);
  --color-pink-primary-hover: var(--color-pink-primary-hover);
  --color-violet-primary: var(--color-violet-primary);
  --color-gold-accent: var(--color-gold-accent);
  --color-debt-primary: var(--color-debt-primary);
  --color-status-success: var(--color-status-success);
  --color-status-warning: var(--color-status-warning);
  --color-status-danger: var(--color-status-danger);
  --color-status-info: var(--color-status-info);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --font-sans: "Inter", system-ui, sans-serif;
  --font-display: "Orbitron", monospace;
  --font-mono: "JetBrains Mono", monospace;
}

html { color-scheme: dark; }
html[data-theme="light"] { color-scheme: light; }
html, body { background: var(--color-base-bg); color: var(--color-base-text); }
body { font-family: var(--font-sans); }
```

- [ ] **Step 5:** Write `frontend/index.html` with the three fonts preloaded:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Debt Collector</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6:** Write `frontend/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 7:** Write `frontend/src/router.tsx`:

```tsx
import { createBrowserRouter } from "react-router-dom";
import { HealthRoute } from "./routes/HealthRoute";

export const router = createBrowserRouter([
  { path: "/", element: <HealthRoute /> },
]);
```

- [ ] **Step 8:** Write `frontend/src/routes/HealthRoute.tsx`:

```tsx
import { useQuery } from "@tanstack/react-query";

export function HealthRoute() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/health");
      return res.json() as Promise<{ status: string }>;
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-base-surface border border-base-border rounded-md p-8">
        <h1 className="font-display text-2xl text-pink-primary">Debt Collector</h1>
        <p className="mt-2 text-base-text-muted">
          Backend: {isLoading ? "..." : error ? "DOWN" : data?.status}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 9:** Write `frontend/Dockerfile.dev`:

```dockerfile
FROM node:22-slim
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
CMD ["pnpm", "run", "dev"]
```

- [ ] **Step 10:** Write `frontend/CLAUDE.md` covering folder structure, one-way imports, 300-line rule, tokens-only colour rule. Copy and adapt the frontend section from `BEST_PRACTICES.md`.

- [ ] **Step 11:** Commit.

```bash
git add frontend/
git commit -m "feat(frontend): scaffold React app with Tailwind tokens and health page"
```

---

### Task 1.4 — Docker Compose

- [ ] **Step 1:** Write root `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: debt
      POSTGRES_PASSWORD: debt
      POSTGRES_DB: debt
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U debt"]
      interval: 5s
      timeout: 3s
      retries: 10

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    env_file: .env
    environment:
      DATABASE_URL: postgresql+asyncpg://debt:debt@postgres:5432/debt
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"

volumes:
  postgres_data:
```

- [ ] **Step 2:** Boot + verify:

```bash
cp .env.example .env
docker compose up --build -d
curl http://localhost:8000/health
# Expected: {"status":"ok"}
```

Open http://localhost:5173 and verify the health banner renders.

- [ ] **Step 3:** Commit.

```bash
git add docker-compose.yml
git commit -m "chore: docker compose for dev with postgres, backend, frontend"
```

---

### Task 1.5 — Pre-commit hooks and type sync

- [ ] **Step 1:** Write `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.7.4
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v4.0.0-alpha.8
    hooks:
      - id: prettier
        files: ^frontend/
```

- [ ] **Step 2:** Install + activate:

```bash
pip install pre-commit
pre-commit install
```

- [ ] **Step 3:** Wire up type sync. Add to `frontend/package.json` scripts:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "sync-types": "openapi-typescript http://localhost:8000/openapi.json -o src/types/api.generated.ts"
}
```

```bash
pnpm add -D openapi-typescript
pnpm sync-types
```

- [ ] **Step 4:** Commit.

```bash
git add .pre-commit-config.yaml frontend/package.json frontend/pnpm-lock.yaml frontend/src/types/
git commit -m "chore: pre-commit hooks and OpenAPI type sync"
```

---

# Phase 2 — Authentication & Users

**Goal:** Admin (bootstrapped) and Goddess can log in; password reset works via Resend; JWT + refresh token flow wired end-to-end.

**Files created:**

```
backend/models/
├── user.py              # User, Goddess, RefreshToken, PasswordResetToken models + schemas
backend/core/security.py # password hashing + JWT helpers
backend/services/email/
├── provider.py          # Protocol
├── handler.py           # EmailHandler
├── factory.py
└── providers/
    ├── resend.py
    └── fake.py          # for dev without Resend key
backend/daos/user_dao.py
backend/daos/token_dao.py
backend/controllers/auth_controller.py
backend/routers/auth.py
backend/routers/users.py
backend/dependencies/auth.py  # current_user, require_role
backend/seeds/bootstrap.py    # creates admin + goddess if missing

frontend/src/api/client.ts
frontend/src/api/auth.ts
frontend/src/hooks/useAuth.ts
frontend/src/services/authStore.ts  # zustand or context, no persistence
frontend/src/components/ui/
├── Button.tsx
├── Input.tsx
├── Card.tsx
└── Chip.tsx
frontend/src/routes/
├── LoginRoute.tsx
├── ForgotPasswordRoute.tsx
├── ResetPasswordRoute.tsx
└── DashboardRoute.tsx  # placeholder protected page
frontend/src/routes/guards.tsx   # RequireAuth, RequireRole
```

---

### Task 2.1 — User / Goddess / token models + first migration

- [ ] **Step 1:** Write `backend/models/user.py`:

```python
from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class UserRole(StrEnum):
    ADMIN = "admin"
    GODDESS = "goddess"
    SUB = "sub"


class UserStatus(StrEnum):
    PENDING_ENTRY_TRIBUTE = "pending_entry_tribute"
    ACTIVE = "active"
    BLACKLISTED = "blacklisted"
    DELETED = "deleted"


class Goddess(SQLModel, table=True):
    __tablename__ = "goddess"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    display_name: str
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class User(SQLModel, table=True):
    __tablename__ = "user"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    goddess_id: UUID | None = Field(default=None, foreign_key="goddess.id", index=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    role: UserRole = Field(index=True)
    status: UserStatus = Field(default=UserStatus.ACTIVE, index=True)
    first_name: str | None = None
    last_name: str | None = None
    twitter_handle: str | None = None
    source_note: str | None = None
    theme_preference: str = Field(default="system")  # "system" | "dark" | "light"
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_token"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    token_hash: str = Field(unique=True, index=True)
    expires_at: datetime
    revoked_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PasswordResetToken(SQLModel, table=True):
    __tablename__ = "password_reset_token"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    token_hash: str = Field(unique=True, index=True)
    expires_at: datetime
    used_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

- [ ] **Step 2:** Write `backend/models/__init__.py` to import all models for Alembic:

```python
from models.user import Goddess, PasswordResetToken, RefreshToken, User, UserRole, UserStatus  # noqa: F401
```

- [ ] **Step 3:** Generate first migration using the `new-migration` skill (command already provided in your config):

```bash
docker compose exec backend alembic revision --autogenerate -m "phase2 auth tables"
docker compose exec backend alembic upgrade head
```

Inspect the generated migration; tweak if autogenerate missed enums or defaults. Commit the file under `backend/alembic/versions/`.

- [ ] **Step 4:** Commit.

```bash
git add backend/models/ backend/alembic/versions/
git commit -m "feat(auth): User, Goddess, RefreshToken, PasswordResetToken models"
```

---

### Task 2.2 — Password hashing & JWT helpers

- [ ] **Step 1:** Write `backend/core/security.py`:

```python
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from core.config import get_settings

_settings = get_settings()
_hasher = PasswordHasher(
    memory_cost=_settings.argon2_memory_cost,
    time_cost=_settings.argon2_time_cost,
    parallelism=_settings.argon2_parallelism,
)

ALGO = "HS256"


def hash_password(raw: str) -> str:
    return _hasher.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, raw)
    except VerifyMismatchError:
        return False


def create_access_token(user_id: UUID, role: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=_settings.jwt_access_ttl_minutes)).timestamp()),
        "typ": "access",
    }
    return jwt.encode(payload, _settings.jwt_secret_key, algorithm=ALGO)


def create_refresh_token(user_id: UUID) -> tuple[str, datetime]:
    now = datetime.now(UTC)
    exp = now + timedelta(days=_settings.jwt_refresh_ttl_days)
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "typ": "refresh",
    }
    return jwt.encode(payload, _settings.jwt_secret_key, algorithm=ALGO), exp


def decode_token(token: str, expected_type: str) -> dict:
    data = jwt.decode(token, _settings.jwt_secret_key, algorithms=[ALGO])
    if data.get("typ") != expected_type:
        raise jwt.InvalidTokenError("wrong token type")
    return data
```

- [ ] **Step 2:** Commit.

```bash
git add backend/core/security.py
git commit -m "feat(auth): argon2id hashing and JWT helpers"
```

---

### Task 2.3 — Email service adapter (Resend + fake)

- [ ] **Step 1:** Write `backend/services/email/provider.py`:

```python
from typing import Protocol


class EmailProvider(Protocol):
    async def send(self, *, to: str, subject: str, html: str) -> None: ...
```

- [ ] **Step 2:** Write `backend/services/email/providers/resend.py`:

```python
import resend
from services.email.provider import EmailProvider


class ResendEmailProvider(EmailProvider):
    def __init__(self, api_key: str, from_email: str):
        resend.api_key = api_key
        self.from_email = from_email

    async def send(self, *, to: str, subject: str, html: str) -> None:
        resend.Emails.send({"from": self.from_email, "to": to, "subject": subject, "html": html})
```

- [ ] **Step 3:** Write `backend/services/email/providers/fake.py`:

```python
import structlog
from services.email.provider import EmailProvider

log = structlog.get_logger()


class FakeEmailProvider(EmailProvider):
    """Logs emails instead of sending. Used when no Resend key is configured."""

    async def send(self, *, to: str, subject: str, html: str) -> None:
        log.info("fake_email_send", to=to, subject=subject, html=html)
```

- [ ] **Step 4:** Write `backend/services/email/handler.py`:

```python
from services.email.provider import EmailProvider


class EmailHandler:
    def __init__(self, provider: EmailProvider):
        self._provider = provider

    async def send_password_reset(self, *, to: str, reset_url: str) -> None:
        html = f"""
        <p>Someone requested a password reset for your Debt Collector account.</p>
        <p><a href="{reset_url}">Reset your password</a> (valid for 1 hour).</p>
        <p>If you did not request this, ignore this email.</p>
        """
        await self._provider.send(to=to, subject="Reset your password", html=html)
```

- [ ] **Step 5:** Write `backend/services/email/factory.py`:

```python
from core.config import Settings
from services.email.handler import EmailHandler
from services.email.providers.fake import FakeEmailProvider
from services.email.providers.resend import ResendEmailProvider


def build_email_handler(settings: Settings) -> EmailHandler:
    if settings.resend_api_key:
        provider = ResendEmailProvider(settings.resend_api_key, settings.resend_from_email)
    else:
        provider = FakeEmailProvider()
    return EmailHandler(provider)
```

- [ ] **Step 6:** Commit.

```bash
git add backend/services/email/
git commit -m "feat(email): Resend + fake providers behind EmailHandler"
```

---

### Task 2.4 — Auth DAO, controller, routes

- [ ] **Step 1:** Write `backend/daos/user_dao.py`:

```python
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User, UserStatus


class UserDAO:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self.session.get(User, user_id)

    async def get_by_username(self, username: str) -> User | None:
        r = await self.session.execute(select(User).where(User.username == username))
        return r.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        r = await self.session.execute(select(User).where(User.email == email))
        return r.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        return user

    async def update_status(self, user_id: UUID, status: UserStatus) -> None:
        user = await self.get_by_id(user_id)
        if user:
            user.status = status
            self.session.add(user)
```

- [ ] **Step 2:** Write `backend/daos/token_dao.py`:

```python
import hashlib
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import PasswordResetToken, RefreshToken


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


class TokenDAO:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_refresh(self, user_id: UUID, raw_token: str, expires_at: datetime) -> None:
        self.session.add(RefreshToken(user_id=user_id, token_hash=_hash(raw_token), expires_at=expires_at))
        await self.session.flush()

    async def find_refresh(self, raw_token: str) -> RefreshToken | None:
        r = await self.session.execute(select(RefreshToken).where(RefreshToken.token_hash == _hash(raw_token)))
        return r.scalar_one_or_none()

    async def revoke_refresh(self, raw_token: str) -> None:
        rt = await self.find_refresh(raw_token)
        if rt:
            rt.revoked_at = datetime.now(UTC)
            self.session.add(rt)

    async def save_reset(self, user_id: UUID, raw_token: str, expires_at: datetime) -> None:
        self.session.add(PasswordResetToken(user_id=user_id, token_hash=_hash(raw_token), expires_at=expires_at))
        await self.session.flush()

    async def use_reset(self, raw_token: str) -> PasswordResetToken | None:
        r = await self.session.execute(select(PasswordResetToken).where(PasswordResetToken.token_hash == _hash(raw_token)))
        tok = r.scalar_one_or_none()
        if tok and tok.used_at is None and tok.expires_at > datetime.now(UTC):
            tok.used_at = datetime.now(UTC)
            self.session.add(tok)
            return tok
        return None
```

- [ ] **Step 3:** Write `backend/controllers/auth_controller.py`:

```python
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from core.config import get_settings
from core.exceptions import Conflict, NotFound, Unauthorized
from core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from daos.token_dao import TokenDAO
from daos.user_dao import UserDAO
from models.user import User, UserStatus
from services.email.handler import EmailHandler

_settings = get_settings()


class AuthController:
    def __init__(self, user_dao: UserDAO, token_dao: TokenDAO, email_handler: EmailHandler):
        self.users = user_dao
        self.tokens = token_dao
        self.email = email_handler

    async def login(self, username: str, password: str) -> dict:
        user = await self.users.get_by_username(username)
        if not user or not verify_password(password, user.password_hash):
            raise Unauthorized("Invalid credentials")
        if user.status == UserStatus.BLACKLISTED:
            raise Unauthorized("Account blacklisted")
        access = create_access_token(user.id, user.role)
        refresh, exp = create_refresh_token(user.id)
        await self.tokens.save_refresh(user.id, refresh, exp)
        return {"access_token": access, "refresh_token": refresh, "role": user.role, "user_id": str(user.id)}

    async def refresh(self, refresh_token: str) -> dict:
        try:
            data = decode_token(refresh_token, "refresh")
        except Exception as e:
            raise Unauthorized("Invalid refresh token") from e
        stored = await self.tokens.find_refresh(refresh_token)
        if not stored or stored.revoked_at is not None:
            raise Unauthorized("Refresh token revoked or unknown")
        user_id = UUID(data["sub"])
        user = await self.users.get_by_id(user_id)
        if not user:
            raise Unauthorized("User not found")
        access = create_access_token(user.id, user.role)
        return {"access_token": access, "role": user.role}

    async def logout(self, refresh_token: str) -> None:
        await self.tokens.revoke_refresh(refresh_token)

    async def start_password_reset(self, email: str) -> None:
        user = await self.users.get_by_email(email)
        if not user:
            return  # do not leak existence
        raw = secrets.token_urlsafe(48)
        exp = datetime.now(UTC) + timedelta(hours=1)
        await self.tokens.save_reset(user.id, raw, exp)
        url = f"{_settings.app_url}/reset-password?token={raw}"
        await self.email.send_password_reset(to=user.email, reset_url=url)

    async def complete_password_reset(self, raw_token: str, new_password: str) -> None:
        tok = await self.tokens.use_reset(raw_token)
        if not tok:
            raise Unauthorized("Invalid or expired reset token")
        user = await self.users.get_by_id(tok.user_id)
        if not user:
            raise NotFound("User not found")
        user.password_hash = hash_password(new_password)
        self.users.session.add(user)
```

- [ ] **Step 4:** Write `backend/dependencies/auth.py`:

```python
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_session
from core.exceptions import Forbidden, Unauthorized
from core.security import decode_token
from daos.user_dao import UserDAO
from models.user import User, UserRole


async def current_user(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise Unauthorized("Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        data = decode_token(token, "access")
    except Exception as e:
        raise Unauthorized("Invalid access token") from e
    user = await UserDAO(session).get_by_id(UUID(data["sub"]))
    if not user:
        raise Unauthorized("User no longer exists")
    return user


def require_role(*allowed: UserRole):
    async def guard(user: User = Depends(current_user)) -> User:
        if user.role not in allowed:
            raise Forbidden("Role not permitted")
        return user
    return guard
```

- [ ] **Step 5:** Write `backend/routers/auth.py` using `new-backend-route` conventions:

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.auth_controller import AuthController
from core.config import get_settings
from core.db import get_session
from daos.token_dao import TokenDAO
from daos.user_dao import UserDAO
from services.email.factory import build_email_handler

router = APIRouter(prefix="/auth", tags=["auth"])


def _controller(session: AsyncSession = Depends(get_session)) -> AuthController:
    return AuthController(UserDAO(session), TokenDAO(session), build_email_handler(get_settings()))


class LoginIn(BaseModel):
    username: str
    password: str


class LoginOut(BaseModel):
    access_token: str
    refresh_token: str
    role: str
    user_id: str


class RefreshIn(BaseModel):
    refresh_token: str


class RefreshOut(BaseModel):
    access_token: str
    role: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str


@router.post("/login", response_model=LoginOut)
async def login(body: LoginIn, ctrl: AuthController = Depends(_controller), session: AsyncSession = Depends(get_session)):
    result = await ctrl.login(body.username, body.password)
    await session.commit()
    return result


@router.post("/refresh", response_model=RefreshOut)
async def refresh(body: RefreshIn, ctrl: AuthController = Depends(_controller)):
    return await ctrl.refresh(body.refresh_token)


@router.post("/logout")
async def logout(body: RefreshIn, ctrl: AuthController = Depends(_controller), session: AsyncSession = Depends(get_session)):
    await ctrl.logout(body.refresh_token)
    await session.commit()
    return {"ok": True}


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordIn, ctrl: AuthController = Depends(_controller), session: AsyncSession = Depends(get_session)):
    await ctrl.start_password_reset(body.email)
    await session.commit()
    return {"ok": True}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordIn, ctrl: AuthController = Depends(_controller), session: AsyncSession = Depends(get_session)):
    await ctrl.complete_password_reset(body.token, body.new_password)
    await session.commit()
    return {"ok": True}
```

Include the router in `main.py`:

```python
from routers import auth as auth_router
app.include_router(auth_router.router)
```

- [ ] **Step 6:** Commit.

```bash
git add backend/
git commit -m "feat(auth): login, refresh, logout, password reset end-to-end"
```

---

### Task 2.5 — Seed admin + goddess + goddess_id on admin user

- [ ] **Step 1:** Write `backend/seeds/bootstrap.py`:

```python
import asyncio
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.db import SessionMaker
from core.security import hash_password
from models.user import Goddess, User, UserRole, UserStatus


async def bootstrap(session: AsyncSession) -> None:
    s = get_settings()
    res = await session.execute(select(User).where(User.role == UserRole.ADMIN))
    if res.scalar_one_or_none() is None:
        session.add(User(
            id=uuid4(),
            username=s.admin_username,
            email=s.admin_email,
            password_hash=hash_password(s.admin_password),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        ))

    res = await session.execute(select(Goddess))
    if res.scalar_one_or_none() is None:
        # one Goddess is bootstrapped; display_name and password set via /admin later
        session.add(Goddess(
            id=uuid4(),
            display_name="Goddess Mean Mal",
            email="mean.mal@debt-collector.local",
            password_hash=hash_password("change-me"),
        ))
    await session.commit()


if __name__ == "__main__":
    async def _main():
        async with SessionMaker() as session:
            await bootstrap(session)
    asyncio.run(_main())
```

Wire into lifespan for dev convenience:

```python
# in backend/main.py lifespan
from core.db import SessionMaker
from seeds.bootstrap import bootstrap

async with SessionMaker() as session:
    await bootstrap(session)
```

- [ ] **Step 2:** Restart backend, verify admin login via curl:

```bash
curl -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"change-me"}'
```

Expected: JSON with `access_token`, `refresh_token`, `role: "admin"`.

- [ ] **Step 3:** Commit.

```bash
git add backend/seeds/ backend/main.py
git commit -m "feat(seed): bootstrap admin and goddess on startup"
```

---

### Task 2.6 — Frontend auth: client, hooks, login screen

- [ ] **Step 1:** Run `pnpm sync-types` to refresh `api.generated.ts` now that `/auth/*` exists.

- [ ] **Step 2:** Write `frontend/src/api/client.ts`:

```ts
import createClient from "openapi-fetch";
import type { paths } from "../types/api.generated";

export const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const api = createClient<paths>({ baseUrl: apiBase });

export function setAccessToken(token: string | null) {
  api.use({
    onRequest({ request }) {
      if (token) request.headers.set("Authorization", `Bearer ${token}`);
    },
  });
}
```

- [ ] **Step 3:** Write `frontend/src/services/authStore.ts` (React context):

```ts
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { setAccessToken } from "../api/client";

type Role = "admin" | "goddess" | "sub";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  role: Role | null;
  userId: string | null;
  login(data: { access_token: string; refresh_token: string; role: string; user_id: string }): void;
  logout(): void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccess] = useState<string | null>(null);
  const [refreshToken, setRefresh] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const login = useCallback((d: { access_token: string; refresh_token: string; role: string; user_id: string }) => {
    setAccess(d.access_token);
    setRefresh(d.refresh_token);
    setRole(d.role as Role);
    setUserId(d.user_id);
    setAccessToken(d.access_token);
  }, []);

  const logout = useCallback(() => {
    setAccess(null); setRefresh(null); setRole(null); setUserId(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ accessToken, refreshToken, role, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
```

Mount `AuthProvider` around the router in `main.tsx`.

- [ ] **Step 4:** Scaffold design-system primitives via `new-frontend-component` command. Create `frontend/src/components/ui/Button.tsx`, `Input.tsx`, `Card.tsx`, `Chip.tsx` — each reading styles from `design_charter.html` mocks (variants: `primary` / `secondary` / `gold` / `destructive` / `violet`; chips: success/pending/rejected/breached/closed/info). **Strict:** pure presentational, no API calls; no inline hex.

- [ ] **Step 5:** Write `frontend/src/routes/LoginRoute.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../services/authStore";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";

export function LoginRoute() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await api.POST("/auth/login", { body: { username, password } });
    if (error || !data) { setError("Invalid credentials"); return; }
    auth.login(data);
    navigate(data.role === "admin" ? "/admin" : "/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="font-display text-3xl text-pink-primary mb-6">Debt Collector</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-status-danger text-sm">{error}</p>}
          <Button type="submit">Log in</Button>
        </form>
        <a href="/forgot-password" className="block mt-4 text-sm text-base-text-muted hover:text-pink-primary">
          Forgot password?
        </a>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6:** Write `frontend/src/routes/guards.tsx`:

```tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../services/authStore";
import type { ReactNode } from "react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />;
}

export function RequireRole({ roles, children }: { roles: ("admin" | "goddess" | "sub")[]; children: ReactNode }) {
  const { role, accessToken } = useAuth();
  if (!accessToken) return <Navigate to="/login" replace />;
  return role && roles.includes(role) ? <>{children}</> : <Navigate to="/" replace />;
}
```

- [ ] **Step 7:** Add forgot + reset routes following the same pattern (`ForgotPasswordRoute.tsx`, `ResetPasswordRoute.tsx`) calling `/auth/forgot-password` and `/auth/reset-password`. Keep each under 120 lines.

- [ ] **Step 8:** Update `router.tsx` with the new routes and a placeholder `DashboardRoute.tsx` behind `RequireAuth`.

- [ ] **Step 9:** Verify end-to-end in browser: log in as `admin` / `change-me` → redirect to `/admin` (placeholder for now).

- [ ] **Step 10:** Commit.

```bash
git add frontend/
git commit -m "feat(frontend): auth store, login/forgot/reset screens, UI primitives"
```

---

# Phase 3 — Invitations & Entry Tribute

**Goal:** Goddess can create an invitation link → sub visits it → signs up → lands on a locked screen requesting entry tribute → sub declares payment (skeleton of the declaration flow, details in Phase 4).

**Files created:**

```
backend/models/invitation.py
backend/daos/invitation_dao.py
backend/controllers/invitation_controller.py
backend/routers/invitations.py   # /goddess/invitations (create) + /invite/{token} (public)
backend/routers/signup.py        # /invite/{token}/signup

frontend/src/routes/goddess/InviteSubRoute.tsx
frontend/src/routes/goddess/InvitationsListRoute.tsx
frontend/src/routes/public/InviteLandingRoute.tsx
frontend/src/routes/public/SignupRoute.tsx
frontend/src/routes/sub/PendingEntryTributeRoute.tsx
```

Core steps:

- Create `Invitation` table (token, goddess_id, entry_tribute_amount, note, expires_at, used_at, created_at).
- Alembic migration.
- `InvitationDAO` + `InvitationController` (create, fetch by token, consume on signup).
- `POST /goddess/invitations` (goddess-only) returns URL + token, `days` expiration default 7.
- `GET /invite/{token}` public: returns goddess display_name, note, entry amount, expiry.
- `POST /invite/{token}/signup` creates sub with `status=PENDING_ENTRY_TRIBUTE`, links `goddess_id`, consumes invitation, returns session like login.
- Frontend: `InviteSubRoute` form — **`entry_tribute_amount` (GBP, required, positive Decimal, no default pre-filled)**, note (optional), expiry in days. Shows generated URL in a copy card. Validation rejects 0 or blank.
- Backend: `entry_tribute_amount` validated as `Decimal > 0`, stored at 2 decimals.
- Frontend: `InviteLandingRoute` fetches `/invite/{token}` and renders signup form.
- `PendingEntryTributeRoute` shows Goddess's payment methods (Phase 4) and a "Declare payment" button — stub link for now.

Each task follows the Phase 2 pattern: model → migration → DAO → controller → router → frontend route → commit. Each task ≤ 120 min.

Per-task checkbox skeleton (apply to every task above):

- [ ] Step 1: Write model(s) with goddess_id FK and indices.
- [ ] Step 2: Generate + review Alembic migration.
- [ ] Step 3: Write DAO (`get_by_token`, `create`, `consume`).
- [ ] Step 4: Write controller with domain errors (`NotFound` for bad token, `Conflict` if consumed/expired).
- [ ] Step 5: Write router with Pydantic In/Out schemas.
- [ ] Step 6: Mount router in `main.py`, run `pnpm sync-types`.
- [ ] Step 7: Write frontend route(s), keep under 300 lines.
- [ ] Step 8: Verify flow manually in browser (Goddess creates invite → sub opens URL in incognito → signup → redirect).
- [ ] Step 9: Commit per task.

---

# Phase 4 — Payment Methods + Declarations

**Goal:** Goddess can configure her payment methods. Subs (and Goddess on their behalf) can declare payments. Goddess can validate / re-categorize / reject. Ledger writes an allocation on validation.

### Task 4.1 — Payment methods (Goddess settings)

Tables: `payment_method` (id, goddess_id, name, type enum, handle_or_link, note, enabled, sort_order, created_at).

- [ ] Model + migration.
- [ ] DAO (`list_active_by_goddess`, `create`, `update`, `delete_soft` via `enabled=false`).
- [ ] Controller with reorder action (`set_sort_order(method_id, position)`).
- [ ] Router `/goddess/payment-methods` (full CRUD).
- [ ] Frontend `PaymentMethodsRoute.tsx` with drag-reorder (use `@dnd-kit/core`, install if needed).
- [ ] Commit.

### Task 4.2 — Payment declaration model + allocation

Tables:

- `payment_declaration` (id, sub_id, goddess_id, method_id FK, amount numeric(10,2), external_timestamp nullable, note, category enum `entry|rolling|weekly_debt|debt_payment|buyout|tribute`, status enum `pending|validated|rejected|cancelled`, created_by FK user, declared_at, validated_at nullable, validated_by FK user nullable, rejection_reason nullable).
- `payment_allocation` (id, declaration_id FK unique, target_type enum, target_id UUID nullable polymorphic, amount).

- [ ] Models with proper enum types + indices on (sub_id, status), (goddess_id, status).
- [ ] Alembic migration; check enum types are created.
- [ ] `PaymentDeclarationDAO` with methods: `create`, `list_pending_for_goddess`, `list_for_sub`, `get_by_id`, `update`, `cancel`.
- [ ] `PaymentAllocationDAO` with `create`, `list_for_target(target_type, target_id)`, `sum_for_sub(sub_id)`, `sum_for_goddess(goddess_id)`.
- [ ] `PaymentController` with operations:
  - `declare_as_sub(sub, amount, method_id, category, external_timestamp?, note?)`
  - `record_as_goddess(goddess, sub_id, amount, method_id, category, ...)` → creates already-validated declaration + allocation in one go
  - `edit_pending_as_sub(sub, declaration_id, patch)`
  - `cancel_pending_as_sub(sub, declaration_id)`
  - `validate(goddess, declaration_id, recategorize_to?: Category)` → emits allocation, updates cached counters
  - `reject(goddess, declaration_id, reason?)`

Validation rules (enforce in controller):
- `entry` category only allowed while sub status is `pending_entry_tribute`; on validation, promote sub to `active`.
- `weekly_debt` / `debt_payment` / `buyout` require a `target_id` pointing to a contract **owned by this sub** and **ACTIVE**.
- `buyout` amount must equal `exit_due(t)` (±£0.01 tolerance) or be rejected.
- `rolling` only allowed if sub has an active rolling with `amount > 0`.

- [ ] Routers:
  - `POST /sub/payments` (sub declares)
  - `PATCH /sub/payments/{id}` (edit while pending)
  - `DELETE /sub/payments/{id}` (cancel while pending)
  - `GET /sub/payments` (own history)
  - `GET /goddess/payments?status=pending` (list)
  - `POST /goddess/payments/{id}/validate` (body: `{recategorize_to?: Category}`)
  - `POST /goddess/payments/{id}/reject` (body: `{reason?: string}`)
  - `POST /goddess/payments/record` (direct record, body: sub_id + fields)
- [ ] Frontend:
  - `PaymentFormRoute.tsx` (sub): category radio, amount, method select (fetches Goddess methods), optional timestamp, note, submit.
  - `PaymentHistoryRoute.tsx` (sub): list with chips (pending/validated/rejected).
  - `PendingValidationsRoute.tsx` (Goddess): table with Validate / Reject / Re-categorize inline dropdown.
  - `RecordPaymentRoute.tsx` (Goddess): direct-entry form.
- [ ] Run `sync-types` after backend changes.
- [ ] Commit per sub-task.

---

# Phase 5 — Rolling Tributes

Tables: `rolling_tribute` (one-per-sub unique constraint on `sub_id`).

- [ ] Model: `amount`, `deadline_day` (enum Mon–Sun), `deadline_time`, `late_multiplier_per_day` (int, default 1), `paused` (bool), `notes`, `last_paid_at`, `created_at`, `updated_at`.
- [ ] Migration with unique index on `sub_id`.
- [ ] DAO `RollingTributeDAO`: `get_for_sub`, `upsert(sub_id, payload)`, `mark_paid(sub_id, at)`.
- [ ] Utility `utils/rolling.py`:

```python
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from models.rolling import RollingTribute

LONDON = ZoneInfo("Europe/London")
DAY_INDEX = {"mon":0,"tue":1,"wed":2,"thu":3,"fri":4,"sat":5,"sun":6}


def current_cycle_deadline(rolling: RollingTribute, now: datetime) -> datetime:
    """Return deadline datetime of the current cycle (in UTC)."""
    now_uk = now.astimezone(LONDON)
    day_target = DAY_INDEX[rolling.deadline_day.value]
    days_until = (day_target - now_uk.weekday()) % 7
    candidate = datetime.combine(now_uk.date() + timedelta(days=days_until), rolling.deadline_time, LONDON)
    if candidate < now_uk:
        candidate += timedelta(days=7)
    return candidate.astimezone(tz=None)


def days_late(rolling: RollingTribute, now: datetime) -> int:
    deadline = current_cycle_deadline(rolling, now) - timedelta(days=7)  # last deadline
    now_uk = now.astimezone(LONDON)
    if now_uk < deadline:
        return 0
    return (now_uk.date() - deadline.date()).days


def amount_due(rolling: RollingTribute, now: datetime) -> float:
    if rolling.paused or rolling.amount == 0:
        return 0.0
    late = days_late(rolling, now)
    return float(rolling.amount) * (1 + late * rolling.late_multiplier_per_day)
```

- [ ] Controller + router `/goddess/subs/{sub_id}/rolling` (GET, PUT for upsert; DELETE sets amount=0).
- [ ] Frontend: inline edit on `SubDetailRoute.tsx` (Phase 9 dashboard) — for now a standalone `RollingEditorRoute.tsx` is sufficient.
- [ ] Wire `mark_paid` in `PaymentController.validate` when allocation target_type == `rolling`.
- [ ] Commit.

---

# Phase 6 — Debt Contracts & Negotiation

Tables: `debt_contract` (full spec from design doc §6.1 + status enum + `current_version_id`), `debt_contract_version` (every counter-proposal snapshots the terms for diffing), `debt_contract_audit` (transition log).

Split into tasks:

### Task 6.1 — Model + enums + migration
Fields exactly per design doc table 6.1, plus `current_version_id` FK, `sub_initiated` bool.

### Task 6.2 — DAO + Controller (state machine)
Implement every transition listed in design doc §6.2 as a controller method: `propose_as_goddess`, `propose_as_sub`, `counter_propose_as_goddess`, `counter_propose_as_sub`, `accept_counter_as_goddess`, `reject_counter_as_goddess` (keeps original, moves to PENDING_SUB_SIGNATURE), `sign_as_sub` (hooked to Phase 7 signature), `close_as_goddess_pending`.

Enforce the **one-round-negotiation** rule in the controller using `contract.version.round_no` (0 = original, 1 = counter). Raise `Conflict` if a second counter is attempted.

### Task 6.3 — Financial simulation
Write `utils/finance.py`:

```python
from decimal import Decimal

from models.debt import DebtContract

PERIOD_FACTOR = {"weekly": Decimal("12") / Decimal("52"), "biweekly": Decimal("12") / Decimal("26"), "monthly": Decimal("1")}


def monthly_rate(contract: DebtContract) -> Decimal:
    r = Decimal(str(contract.interest_rate))
    if contract.interest_period == "monthly":
        return r
    # yearly → AER: (1+r)^(1/12) - 1
    return (Decimal(1) + r) ** (Decimal(1) / Decimal(12)) - Decimal(1)


def period_rate(contract: DebtContract) -> Decimal:
    return monthly_rate(contract) * PERIOD_FACTOR[contract.payment_frequency]


def simulate(contract: DebtContract) -> list[dict]:
    """Returns period-by-period projection assuming min payment, no late, no penalty."""
    r = period_rate(contract)
    bal = Decimal(str(contract.principal))
    mp = Decimal(str(contract.minimum_payment))
    out = []
    for i in range(1, contract.duration_periods + 1):
        bal = (bal * (Decimal(1) + r)).quantize(Decimal("0.01"))
        pay = min(mp, bal)
        bal = (bal - pay).quantize(Decimal("0.01"))
        out.append({"period": i, "balance_before_payment": str(bal + pay), "payment": str(pay), "balance_end": str(bal)})
        if bal <= 0: break
    return out


def exit_due(contract: DebtContract, elapsed_periods: int) -> Decimal:
    total = Decimal(contract.duration_periods)
    if total == 0: return Decimal("0")
    return (Decimal(str(contract.exit_amount)) * Decimal(elapsed_periods) / total).quantize(Decimal("0.01"))


def severe_warning(contract: DebtContract) -> bool:
    r = period_rate(contract)
    bal = Decimal(str(contract.principal))
    mp = Decimal(str(contract.minimum_payment))
    pen = Decimal(str(contract.late_penalty_percent))
    after_penalty_growth = bal * (Decimal(1) + r) * (Decimal(1) + pen)
    return after_penalty_growth - mp > bal
```

### Task 6.4 — Routers
- `POST /goddess/subs/{sub_id}/debts` (propose as goddess) — body: contract fields
- `POST /sub/debts` (propose as sub)
- `POST /debts/{id}/counter-propose` (sub or goddess depending on state)
- `POST /debts/{id}/accept-counter` (goddess only)
- `POST /debts/{id}/reject-counter` (goddess only)
- `POST /goddess/debts/{id}/close` (cancel pending)
- `GET /debts/{id}` (sub sees own, goddess sees her subs')
- `GET /sub/debts` / `GET /goddess/debts`
- `POST /debts/{id}/simulate` (stateless; also callable on draft) — returns projection

### Task 6.5 — Frontend
- `ContractFormRoute.tsx` (Goddess or Sub) with all fields, live simulation graph (use `recharts`), severe-warning banner.
- `ContractReviewRoute.tsx` showing diff between original and counter (use `diff-match-patch` or custom side-by-side).
- `ContractSignRoute.tsx` — defers to Phase 7 for signature; for now just "Sign" button placeholder.

### Task 6.6 — Commit

---

# Phase 7 — Signature & PDF Generation

### Task 7.1 — R2 adapter
`services/storage/provider.py`, `providers/r2.py` (aiobotocore), `providers/fake.py` (local filesystem for dev), `handler.py` (`upload_pdf`, `presign_download(key, ttl=900)`), `factory.py` (Resend-style selector).

### Task 7.2 — PDF generator
`services/pdf/generator.py`:

```python
from decimal import Decimal
import hashlib

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from models.debt import DebtContract
from services.pdf.templates_dir import TEMPLATES_DIR

_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)


def generate(contract: DebtContract, goddess_name: str, sub_full_name: str, signature_png_b64: str, signed_at_iso: str) -> tuple[bytes, str]:
    tmpl = _env.get_template("contract.html")
    html = tmpl.render(
        contract=contract,
        goddess_name=goddess_name,
        sub_full_name=sub_full_name,
        signature_b64=signature_png_b64,
        signed_at=signed_at_iso,
    )
    pdf_bytes = HTML(string=html, base_url=TEMPLATES_DIR).write_pdf()
    sha = hashlib.sha256(pdf_bytes).hexdigest()
    return pdf_bytes, sha
```

Template `backend/services/pdf/templates/contract.html`: style with Playfair Display + Source Serif Pro per design charter. Include all contract terms, exit amount, schedule simulation table, signature block embedding the PNG inline (`<img src="data:image/png;base64,{{signature_b64}}">`), signed date.

### Task 7.3 — Signature canvas component
Frontend `components/signature/SignaturePad.tsx` using `react-signature-canvas` (install: `pnpm add react-signature-canvas`). Exposes `getDataURL()`.

### Task 7.4 — Sign endpoint
`POST /sub/debts/{id}/sign` — body: `{signature_png_b64: string}`. Controller:

1. Ensure contract in `PENDING_SUB_SIGNATURE`, belongs to current sub.
2. Generate PDF, compute sha256.
3. Upload to R2 at key `contracts/{goddess_id}/{contract_id}.pdf`.
4. Set contract `signed_pdf_url=key, signed_pdf_sha256=sha, signed_at=now, status=ACTIVE, activated_at=now`.
5. Commit.
6. Return presigned download URL.

### Task 7.5 — Download endpoint
`GET /debts/{id}/pdf` — 302 to presigned R2 URL (owner check: sub owns it, or goddess owns the sub).

### Task 7.6 — Frontend sign screen wired + download button on contract detail page. Commit.

---

# Phase 8 — Ledger, Cronjob, and Contract Lifecycle

### Task 8.1 — `debt_event` ledger
Model per design doc §6.4 with unique constraint on `(contract_id, period_index, event_type)` for period-bound events to make cron idempotent.

### Task 8.2 — Balance recomputation
`utils/ledger.py`:

```python
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.debt import DebtContract
from models.debt_event import DebtEvent, EventType

SIGN = {
    EventType.PERIOD_INTEREST: "multiplicative",  # balance *= (1 + r)  → amount stored = r
    EventType.LATE_PENALTY: "multiplicative",     # balance *= (1 + pen) → amount stored = pen
    EventType.PAYMENT_APPLIED: "subtract",
    EventType.ADJUSTMENT: "add",
    EventType.SURPRISE_PENALTY: "add",
    EventType.BUYOUT_PAID: "close",
}


async def recompute_balance(session: AsyncSession, contract_id) -> Decimal:
    contract = await session.get(DebtContract, contract_id)
    r = await session.execute(select(DebtEvent).where(DebtEvent.contract_id == contract_id).order_by(DebtEvent.created_at.asc(), DebtEvent.id.asc()))
    events = r.scalars().all()
    bal = Decimal(str(contract.principal))
    for ev in events:
        amt = Decimal(str(ev.amount))
        op = SIGN[ev.event_type]
        if op == "multiplicative":
            bal = (bal * (Decimal(1) + amt)).quantize(Decimal("0.01"))
        elif op == "subtract":
            bal = (bal - amt).quantize(Decimal("0.01"))
        elif op == "add":
            bal = (bal + amt).quantize(Decimal("0.01"))
        elif op == "close":
            bal = Decimal("0.00")
    return bal
```

Update `balance_cached` on contract via a helper called after every event write.

### Task 8.3 — Payment integration
In `PaymentController.validate`, if target is a contract, emit a `PAYMENT_APPLIED` event. If `buyout`, emit `BUYOUT_PAID` and transition contract to `CLOSED`. Recompute balance.

### Task 8.4 — APScheduler job
`workers/daily_cron.py`:

```python
import structlog
from datetime import UTC, datetime
from zoneinfo import ZoneInfo
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from controllers.cron_controller import CronController
from core.config import get_settings
from core.db import SessionMaker

log = structlog.get_logger()
LONDON = ZoneInfo("Europe/London")


async def _run_once():
    async with SessionMaker() as session:
        ctrl = CronController(session)
        await ctrl.run_daily()
        await session.commit()


def start_scheduler() -> AsyncIOScheduler:
    s = AsyncIOScheduler(timezone=LONDON)
    s.add_job(_run_once, CronTrigger(hour=8, minute=0), id="daily_08_uk", replace_existing=True)
    s.start()
    log.info("scheduler_started", time="08:00 Europe/London")
    return s
```

Mount in `main.py` lifespan, shutdown on app close.

### Task 8.5 — `CronController.run_daily`
Implement the flow of `diagrams.html` §8:

1. Fetch all active subs.
2. For each sub:
   - Rolling: compute deadline / days_late; emit reminder notifs; if late, update multiplier → notif sub + goddess.
   - Debts (ACTIVE): for each contract, compute current period index. If previous period ended without paid weekly_debt, emit `LATE_PENALTY` event + `PERIOD_INTEREST` for new period. Otherwise emit `PERIOD_INTEREST` only. Recompute balance. Push notifs. All period events carry `(contract_id, period_index, event_type)` unique key for idempotency.

Trigger endpoint `POST /admin/cron/run-now` for manual testing.

### Task 8.6 — Buyout

Sub-initiated:
- `POST /sub/debts/{id}/buyout-intent` → calls `exit_due(contract, elapsed_periods)` and returns amount + Goddess's payment methods. No mutation.
- Sub then posts a `PaymentDeclaration` with `category=buyout`, `target_id=contract_id`, amount matching.
- Goddess validates → `PaymentController` calls `contract_controller.close_as_buyout(contract, amount)` which emits `BUYOUT_PAID` event, sets status=`CLOSED`, notifs both sides.
- If `reject`: the declaration is rejected, contract stays `ACTIVE`. Sub sees notif.

### Task 8.7 — Breach & blacklist

- Model `blacklist_entry` per design doc §10.
- `POST /goddess/subs/{sub_id}/breach` (reason?) → transitions all ACTIVE contracts of that sub to `BREACHED`, sets `user.status=BLACKLISTED`, creates blacklist entry (snapshotting latest balance), revokes all refresh tokens, pushes notif.
- `GET /goddess/blacklist` — list with details.
- `POST /goddess/blacklist/{entry_id}/forgive` (body: `{reinstatement_fee_paid: decimal}`) → sets `user.status=ACTIVE`, `entry.forgiven_at=now`, `entry.reinstatement_fee_paid=amount`. Contracts stay `BREACHED`.

### Task 8.8 — Surprise penalty & mid-contract adjustment

- `POST /goddess/debts/{id}/surprise-penalty` (body: `{amount, reason}`). Guard: `contract.dom_can_add_surprise_penalty == true`. Emit `SURPRISE_PENALTY` event.
- Adjustments table + CRUD:
  - `POST /goddess/debts/{id}/adjustments` (body: `{amount, reason}`). Behaviour depends on `mid_contract_addition_mode`:
    - `disabled` → 403
    - `dom_controlled` → status=`applied`, emit `ADJUSTMENT` event immediately
    - `sub_approval_required` → status=`pending_sub_approval`, notif sub
  - `POST /sub/adjustments/{id}/accept` → emits `ADJUSTMENT`, status=`accepted`
  - `POST /sub/adjustments/{id}/refuse` → status=`refused`, notif goddess

### Task 8.9 — Full lifecycle smoke test

Manually via curl + UI:
1. Log in as Goddess → invite sub
2. Sub signs up → declares entry tribute → Goddess validates → sub active
3. Goddess attributes £50 rolling → cron triggered manually → sub sees reminder
4. Goddess proposes debt £1000 @ 20%/mo × 6 periods weekly, min £200, severe → sub signs → PDF downloadable
5. Run cron → period 1 interest applied
6. Sub declares weekly_debt → Goddess validates → balance drops
7. Goddess adds surprise penalty £100 → balance jumps
8. Sub requests buyout → Goddess validates → contract closed

Commit after each task.

---

# Phase 9 — Notifications, Dashboards, Admin

### Task 9.1 — Notification model + publisher

- `notification` table per §9.
- `services/notifications/publisher.py`:

```python
import asyncio
from collections import defaultdict
from uuid import UUID
from typing import Protocol


class NotificationPublisher(Protocol):
    async def publish(self, user_id: UUID, payload: dict) -> None: ...
    async def subscribe(self, user_id: UUID) -> asyncio.Queue: ...
    async def unsubscribe(self, user_id: UUID, q: asyncio.Queue) -> None: ...


class InProcessPublisher(NotificationPublisher):
    def __init__(self):
        self._subs: dict[UUID, list[asyncio.Queue]] = defaultdict(list)

    async def publish(self, user_id: UUID, payload: dict) -> None:
        for q in list(self._subs.get(user_id, [])):
            await q.put(payload)

    async def subscribe(self, user_id: UUID) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=32)
        self._subs[user_id].append(q)
        return q

    async def unsubscribe(self, user_id: UUID, q: asyncio.Queue) -> None:
        if q in self._subs.get(user_id, []):
            self._subs[user_id].remove(q)


publisher = InProcessPublisher()
```

Call `publisher.publish` from every controller that writes a notif row.

### Task 9.2 — WebSocket endpoint

`routers/ws.py`:

```python
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from jwt import InvalidTokenError
from uuid import UUID

from core.security import decode_token
from services.notifications.publisher import publisher

router = APIRouter()


@router.websocket("/ws/notifications")
async def notifications_ws(ws: WebSocket, token: str = Query(...)):
    try:
        data = decode_token(token, "access")
        user_id = UUID(data["sub"])
    except (InvalidTokenError, ValueError, KeyError):
        await ws.close(code=4401); return
    await ws.accept()
    q = await publisher.subscribe(user_id)
    try:
        while True:
            payload = await q.get()
            await ws.send_json(payload)
    except WebSocketDisconnect:
        pass
    finally:
        await publisher.unsubscribe(user_id, q)
```

### Task 9.3 — Frontend notifications

- `hooks/useNotificationsSocket.ts` opening WS, writing to a Zustand/Context store.
- `components/layout/NotificationBell.tsx` with unread counter, drawer listing recent notifs, deep-link on click.

### Task 9.3b — Theme toggle (dark / light)

**Files:**
- Create: `frontend/src/hooks/useTheme.ts`, `frontend/src/components/layout/ThemeToggle.tsx`
- Modify: `frontend/src/components/layout/AppHeader.tsx`, `frontend/src/main.tsx` (pre-hydration script), `backend/routers/me.py` (add `PATCH /me/preferences` with `theme_preference`)
- Modify: `backend/models/user.py` (field already added in Task 2.1), `backend/daos/user_dao.py` (add `update_theme_preference`)

- [ ] **Step 1:** Backend — add endpoint `PATCH /me/preferences` that accepts `{ theme_preference: "system" | "dark" | "light" }` and persists it on the authenticated user. Regenerate openapi client.

- [ ] **Step 2:** Frontend — add a pre-hydration inline script in `index.html` `<head>` before the app loads:

```html
<script>
  (function () {
    var saved = localStorage.getItem('theme') || 'system';
    var isLight = saved === 'light' || (saved === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
    if (isLight) document.documentElement.setAttribute('data-theme', 'light');
  })();
</script>
```

Prevents FOUC on reload.

- [ ] **Step 3:** Write `useTheme.ts`:

```ts
import { useEffect, useState } from "react";
import { api } from "@/services/api";

export type ThemePref = "system" | "dark" | "light";

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(
    () => (localStorage.getItem("theme") as ThemePref) || "system",
  );

  useEffect(() => {
    const apply = (p: ThemePref) => {
      const mql = window.matchMedia("(prefers-color-scheme: light)");
      const effective = p === "system" ? (mql.matches ? "light" : "dark") : p;
      if (effective === "light") document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
    };
    apply(pref);
    localStorage.setItem("theme", pref);
    if (pref === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: light)");
      const handler = () => apply("system");
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
  }, [pref]);

  const update = async (next: ThemePref) => {
    setPref(next);
    await api.PATCH("/me/preferences", { body: { theme_preference: next } });
  };
  return { pref, setPref: update };
}
```

- [ ] **Step 4:** Write `ThemeToggle.tsx` — a segmented control (System / Dark / Light) using `lucide-react` icons (`Monitor`, `Moon`, `Sun`), colour tokens only. Mount in `AppHeader` next to the avatar.

- [ ] **Step 5:** On login, read `user.theme_preference` from the `/me` response and call `setPref(user.theme_preference)` to override the localStorage default. Commit.

### Task 9.4 — Goddess dashboard

- `routes/goddess/DashboardRoute.tsx`:
  - Late payments card (pulled from `/goddess/late-payments` endpoint — writes a new controller `LatePaymentsController` that iterates rollings and contracts to compute overdue list).
  - Pending validations / pending contracts cards.
  - Drained counters (cached in goddess row or computed on demand: `sum_for_goddess`).
  - Active stats chips (subs count, rollings, contracts, blacklisted).

### Task 9.5 — Sub dashboard

- `routes/sub/DashboardRoute.tsx`:
  - Amount-due-this-week chip combining active rolling + weekly_debt obligations.
  - Late banner (crimson) if applicable.
  - Active contracts list with progress bars.
  - Payment history table.
  - Total sent counter.

### Task 9.6 — Per-sub view (Goddess)

- `routes/goddess/SubDetailRoute.tsx`: aggregates rolling editor, contracts list, payment history, blacklist action, drained counter. **Split** into subcomponents to respect 300-line limit.

### Task 9.7 — Admin console

- Backend `/admin/{entity}` generic routes using a small helper:

```python
# routers/admin.py — pseudo-pattern, repeat per entity
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.db import get_session
from dependencies.auth import require_role
from models.user import UserRole

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_role(UserRole.ADMIN))])

# Per entity, register:
# GET /admin/<entity>?q=&page=&page_size= → paginated list
# GET /admin/<entity>/{id}
# PATCH /admin/<entity>/{id} body = partial dict of any field
# POST /admin/<entity>
# DELETE /admin/<entity>/{id}
```

Implement one generic endpoint factory `register_crud(router, Model, prefix)` to avoid duplication across 12 entities.

- Frontend: `/admin` route with sidebar listing entities; each entity page uses `<AdminTable>` + `<AdminForm>` generic components driven by TypeScript schema (hand-write the column/field maps per entity — no need for runtime reflection).

### Task 9.8 — Commit each sub-task.

---

# Phase 10 — Polish & Tests Retrofit

### Task 10.1 — Empty states and error states on every list / card.

### Task 10.2 — Accessibility pass: focus rings, aria-labels on all icon buttons, live regions on counters, keyboard traps on modals, contrast re-check with axe-core via Playwright.

### Task 10.3 — Mobile responsive audit: sub dashboard ≤ 760 px, modal full-screen on mobile, header collapses.

### Task 10.4 — Pre-commit strengthening: add `mypy --strict` on backend, `tsc --noEmit` on frontend via hook.

### Task 10.5 — Pytest retrofit

Follow `writing-pytest-tests` skill. Minimum coverage targets:
- `utils/finance.py` — every branch, including AER conversion, severe warning threshold, exit_due.
- `utils/rolling.py` — DST edge cases (UK clock change weekends), deadline computation.
- `utils/ledger.py` — event ordering, idempotency with duplicate period events.
- `controllers/debt_controller.py` — full state machine coverage, one-round-negotiation guard, breach cascade.
- `controllers/payment_controller.py` — category validation per sub status, re-categorization, buyout amount guard.
- `controllers/cron_controller.py` — idempotent re-run, late penalty application, period roll-over.

### Task 10.6 — Vitest retrofit

Follow `writing-vitest-tests` skill. Target: services, hooks, API wrappers, Zod schemas, and all `ContractForm` / `PaymentForm` / `SignaturePad` components.

### Task 10.7 — Visual regression

Follow `visual-regression` skill: Playwright snapshots for login, Goddess dashboard, Sub dashboard, Contract form simulation, Contract PDF page, Admin table, Blacklist page.

### Task 10.8 — Precommit-fix sweep + tag v0.1.0

```bash
# From root
pnpm --prefix frontend lint --fix
pnpm --prefix frontend format
cd backend && uv run ruff check . --fix && uv run ruff format .
cd .. && git add -A && git commit -m "chore: final polish pass"
git tag v0.1.0
```

### Task 10.9 — Hosting decision (deferred by the user). When ready, follow `Docs/2026-04-13-debt-app-design.md` §11.4 options, write a `DEPLOY.md`, and ship.

---

## Cross-Cutting Conventions (apply to every task)

- **Commit discipline:** each task ends with a focused commit. Prefix: `feat(scope):`, `fix(scope):`, `chore:`, `refactor(scope):`. No AI attribution trailers.
- **Before every commit:** run `precommit-fix` command.
- **After every backend endpoint change:** run `pnpm sync-types` in frontend.
- **After every model change:** use `new-migration` command; review the autogen diff; round-trip test (`alembic upgrade head && alembic downgrade -1 && alembic upgrade head`).
- **GoddessId on every new sub-owned table** — never forget.
- **Always use `Decimal` for money**, never `float`. Frontend too: strings crossing the wire, `Decimal.js` or manual rounding for display.
- **Timezones:** backend stores UTC; all business deadlines computed in `Europe/London`; frontend displays local time with UK label.

---

## Self-Review (performed by the planner)

### 1. Spec coverage

| Spec section | Plan task(s) |
|--------------|--------------|
| §2 Roles | 1.2 (models phase), 2.5 (admin+goddess seed), 9.7 (admin) |
| §3 Currency/language/TZ | 1.3 (tokens), 5 (rolling TZ utility), cross-cutting |
| §4 Auth | Phase 2 entirely |
| §5 Rolling | Phase 5 |
| §6 Debt contract + PDF | Phases 6 + 7 |
| §7 Payment declarations | Phase 4 Task 4.2 |
| §8 Cronjob | Phase 8 Task 8.4–8.5 |
| §9 Notifications | Phase 9 Task 9.1–9.3 |
| §10 Data model | Spread across every phase |
| §11 Architecture | Phase 1 |
| §12 Security | Phase 2 Tasks 2.2, 2.3, cross-cutting |
| §13 Financial math | Phase 6 Task 6.3 + Phase 8 Task 8.2 |
| §14 Open questions | Deferred explicitly (Phase 10 Task 10.9 for hosting, Phase 10.5–10.7 for tests) |
| §15 Build sequence | This plan's phase order |

Use-cases coverage:
- G1 Invite → Phase 3
- G2 Rolling → Phase 5
- G3–G4 Contract → Phase 6
- G5 Validate payment → Phase 4 Task 4.2
- G6 Mid-contract addition → Phase 8 Task 8.8
- G7 Surprise penalty → Phase 8 Task 8.8
- G8 Approve buyout → Phase 8 Task 8.6
- G9 Breach → Phase 8 Task 8.7
- G10 Forgive → Phase 8 Task 8.7
- G11 Per-sub view → Phase 9 Task 9.6
- G12 Payment methods → Phase 4 Task 4.1
- G13 Dashboard → Phase 9 Task 9.4
- S1 Signup → Phase 3
- S2 Declare payment → Phase 4
- S3–S5 Contract flow → Phases 6 + 7
- S6 Approve adjustment → Phase 8 Task 8.8
- S7 Buyout → Phase 8 Task 8.6
- S8 Sub dashboard → Phase 9 Task 9.5
- S9 Blacklist view → Phase 8 Task 8.7 (sub-side screen)
- A1 Admin → Phase 9 Task 9.7

All spec and use-case items map to a task.

### 2. Placeholder scan

No "TBD" / "implement later" / "add error handling" remain in actionable steps. Hosting deferral is explicit per user instruction.

### 3. Type consistency

- `Category` enum defined in Phase 4.2 and referenced identically in Phases 5, 6, 8.
- `EventType` enum defined in Phase 8.1 and used consistently in Phase 8.2/8.3/8.6/8.8.
- `UserStatus` defined in Phase 2.1, used identically across subsequent phases.
- `NotificationPublisher` protocol defined Phase 9.1, consumed identically Phase 9.2.

Plan passes self-review.

---

End of plan.
