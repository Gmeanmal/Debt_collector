# Debt Collector — Best Practices Reference

Extracted from `Malverse_Games` (React 19 + TypeScript frontend, FastAPI backend) to scaffold the upcoming Debt Collector app. Nothing is scaffolded yet — this file is the single source of truth to consult before initializing folders.

---

## 1. Claude Config

### 1.1 CLAUDE.md files (three levels)

- **Root CLAUDE.md** — product model, stack decisions, architecture layers, testing rules, commit conventions, pre-commit hooks.
- **backend/CLAUDE.md** — folder layout, import rules, layer discipline (routers/controllers/daos/models), WebSocket rules, Alembic, testing specifics.
- **frontend/CLAUDE.md** — folder structure, one-way import rule, 300-line component rule, TanStack Query discipline, openapi-fetch patterns, Playwright visual regression, accessibility.

### 1.2 `.claude/` folder

```
.claude/
├── settings.local.json    # Permission whitelist
├── skills/                # Domain skills (auto-triggered by keywords)
│   ├── backend-layer-architecture/SKILL.md
│   ├── writing-pytest-tests/SKILL.md
│   ├── writing-migrations/SKILL.md
│   ├── writing-vitest-tests/SKILL.md
│   ├── external-service-adapter/SKILL.md
│   ├── frontend-component-pattern/SKILL.md
│   └── visual-regression/SKILL.md
├── commands/              # One-shot CLI actions
│   ├── new-migration.md
│   ├── new-backend-route.md
│   ├── new-frontend-component.md
│   ├── sync-types.md
│   ├── test.md
│   ├── precommit-fix.md
│   └── refactor.md
└── agents/                # Multi-step agents
    ├── backend-feature.md
    ├── frontend-feature.md
    ├── test-writer.md
    ├── code-reviewer.md
    └── migration-writer.md
```

> Note: the same skill names are already registered at the Claude Code level — skills can live in `.claude/skills/` per project.

---

## 2. Backend Architecture (FastAPI)

### 2.1 Locked folder structure

```
backend/
├── main.py                    # FastAPI app + lifespan only
├── core/
│   ├── config.py              # Pydantic Settings — ONLY reader of env vars
│   ├── security.py            # JWT, Argon2id
│   ├── ratelimit.py           # Redis + in-memory dev fallback
│   ├── exceptions.py          # Domain exception hierarchy
│   ├── logging.py             # structlog (JSON prod / pretty dev)
│   ├── db.py                  # AsyncSession factory (asyncpg + SQLAlchemy)
│   └── exception_handlers.py  # Domain → HTTP mapping
├── models/                    # SQLModel tables + Pydantic schemas co-located per entity
├── daos/                      # Data access, one class per entity, NO business logic
├── controllers/               # Business logic, one class per domain
├── routers/                   # HTTP surface: unpack → call controller → return
├── services/                  # External adapters (email, storage, …)
│   └── <name>/
│       ├── provider.py        # Protocol
│       ├── handler.py         # Facade (retries, logging, audit)
│       ├── factory.py         # build_X_provider(settings)
│       └── providers/         # ONLY place for vendor SDK imports
├── dependencies/              # FastAPI DI factories
├── middleware/                # RequestId, ReAcceptance, …
├── workers/                   # Background asyncio tasks
├── utils/                     # Cross-cutting helpers
├── seeds/                     # Idempotent seed data
├── tests/
│   ├── fakes/providers/       # RecordingFake providers (not mocks)
│   ├── unit/
│   └── integration/
└── alembic/
    ├── env.py
    ├── script.py.mako
    └── versions/              # NNNN_verb_subject.py
```

### 2.2 Four-layer discipline

- **routers/** — one module per surface; body = unpack inputs → controller call → return. Zero logic, no `if` beyond input unpacking. Every route has explicit `response_model` and `status_code`. Auth via `Depends(require_role(...))`. Never imports DAOs.
- **controllers/** — one class per domain. Ctor receives DAOs + Handlers (never reaches `app.state`). Owns transactions (`async with session.begin():`). Raises **domain exceptions only** (`NotFoundError`, `PermissionDeniedError`, `ConflictError`, `RateLimitedError`, …). Never imports `HTTPException`.
- **daos/** — one class per entity. Ctor takes `AsyncSession`. Methods return rows or raise `NotFoundError` (never return `None`). No business decisions. Cross-entity joins OK; cross-entity rules belong to the controller. DAOs `flush()` for IDs; controllers `commit`. Return type annotations on every method.
- **models/** — one file per entity. Contains table model + enums + all Pydantic schemas (`Create`, `Read`, `Update`, `Admin`). `created_at` / `updated_at` on every entity (server default, UTC). Soft-deletes use `deleted_at: datetime | None`, not booleans.

### 2.3 External Service Adapter Pattern (mandatory)

Every external system (email, storage, SMS, captcha, debt APIs, payment webhook verifiers, …) is wrapped in:

1. **Protocol** — `class XProvider(Protocol): async def op(...) -> ...`
2. **Concrete providers** — vendor-specific, the ONLY place with SDK imports (`providers/smtp.py`, `providers/http.py`, `providers/console.py`, …).
3. **Handler** — cross-vendor concerns (retries, logging, audit).
4. **Factory** — picks provider via env var.
5. **DI dependency** — `get_x_handler(request)`.
6. **Use in controller** via `self._x: XHandler`.

Rules: no vendor SDK imports outside `services/<name>/providers/`. Handler instantiated once at startup on `app.state`. Dev always has a local provider (console/localfs). Tests inject a `RecordingFakeProvider` at the provider boundary.

### 2.4 Dependency Injection (`dependencies/services.py`)

```python
def get_db(request: Request) -> AsyncSession
def get_current_user(token = Depends(...)) -> User
def require_role(*roles: str)  # factory
def get_email_handler(request) -> EmailHandler
def get_storage_handler(request) -> StorageHandler
def get_password_service(request) -> PasswordHasherService
def get_token_service(request) -> TokenService
def get_settings() -> Settings  # lru_cache
```

### 2.5 `main.py` shape

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings)
    app.state.settings = settings
    app.state.rate_limiter = build_rate_limiter(settings)
    app.state.password_service = PasswordHasherService(settings)
    app.state.token_service = TokenService(settings)
    app.state.email_handler = EmailHandler(build_email_provider(settings), default_from=...)
    app.state.storage_handler = StorageHandler(build_storage_provider(settings))
    if settings.app_env != "test":
        await seed_legal_documents(session)
    worker_tasks = []
    if settings.app_env != "test":
        worker_tasks = [asyncio.create_task(run_x(...), name="x"), ...]
    yield
    for t in worker_tasks: t.cancel()
    await asyncio.gather(*worker_tasks, return_exceptions=True)

def create_app() -> FastAPI:
    app = FastAPI(title=..., version=..., lifespan=lifespan)
    app.add_middleware(ReAcceptanceMiddleware)
    app.add_middleware(RequestIdMiddleware)
    if settings.app_env == "dev":
        app.add_middleware(CORSMiddleware, allow_origins=[...])
    register_exception_handlers(app)
    app.include_router(auth_router)
    # ...
    @app.get("/healthz")
    async def healthz(): return {"status": "ok"}
    return app

app = create_app()
```

### 2.6 `pyproject.toml`

Key deps: `fastapi>=0.115`, `sqlmodel>=0.0.22`, `alembic>=1.14`, `asyncpg>=0.30`, `pydantic>=2.9`, `pydantic-settings>=2.6`, `argon2-cffi`, `httpx`, `structlog`, `python-jose[cryptography]`, `email-validator`, `uvicorn[standard]`, `aiosmtplib`, `boto3`.

Tooling:
```toml
[tool.ruff]
line-length = 100
target-version = "py313"
select = ["E","F","I","UP","B","SIM","TCH","ANN"]
# ANN401 ignored (Depends() is self-annotating)

[tool.pyright]
typeCheckingMode = "strict"
pythonVersion = "3.13"
reportUnusedFunction = false
reportAssignmentType = false

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

Package manager: **uv** (`uv run …`).

### 2.7 Testing

- Real ephemeral PostgreSQL (never mocked). Session fixture runs migrations once; per-test uses `session.begin_nested()` (SAVEPOINT) for rollback isolation.
- Factories via **polyfactory** — never hand-written dicts.
- For handlers: real Handler + `RecordingFakeProvider` (inject at provider boundary).
- Coverage floor: **85%** controllers + daos, **70%** routers.
- Structure:
  ```
  tests/
  ├── unit/{controllers,daos,services,utils,dependencies}/
  └── integration/{routers,core,migrations}/
  ```

### 2.8 WebSocket pattern

- One router per surface in `routers/ws/`.
- Auth via token query param (headers stripped by some proxies).
- Heartbeat: server ping every 30s, close on missed pong. Infra idle timeout ≥ 120s.
- Messages = Pydantic models with discriminated union `type: Literal[...]`.
- In-process hub in `core/ws_hub.py` (no Redis pub/sub).

### 2.9 Alembic

- Naming: `NNNN_<verb>_<subject>.py`.
- Always review `--autogenerate` diff — it misses partial unique indexes, enum changes, check constraints, FK `ondelete=`.
- Every migration has a real `downgrade()` reversing `upgrade()`.
- Destructive changes → two-phase: add new → backfill → switch reads → drop old.
- Round-trip test in `tests/integration/test_migrations.py`.

### 2.10 Logging

- `structlog` — JSON prod, pretty dev.
- `RequestIdMiddleware` binds `request_id` to `structlog.contextvars` for every request.
- **Never log secrets** (passwords, tokens, reset tokens, API keys).
- Audit events go through a dedicated `AuditService` → `audit_log` table, not logs.

### 2.11 Auth

- JWT access + refresh with rotation. Refresh in HttpOnly cookies, access in Authorization header.
- Argon2id for password hashing.
- Role-based route guards via `Depends(require_role(...))`.

---

## 3. Frontend Architecture (React 19 + TypeScript)

### 3.1 Locked folder structure

```
frontend/
├── index.html
├── vite.config.ts
├── biome.json
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── public/
├── src/
│   ├── main.tsx               # Mounts TanStack Router
│   ├── routes/                # File-based routes (src/routes/<path>.tsx → URL)
│   ├── routeTree.gen.ts       # GENERATED
│   ├── components/
│   │   ├── shared/ui/         # shadcn/ui primitives, in-repo
│   │   └── <surface>/         # Per surface (auth, admin, …)
│   ├── services/              # Pure TS, React-free
│   │   ├── auth/
│   │   ├── validation/        # Zod schemas per domain
│   │   └── websocket/
│   ├── api/
│   │   ├── client.ts          # openapi-fetch singleton + auth middleware
│   │   ├── types/api.generated.ts   # GENERATED, never hand-edit
│   │   └── <domain>.ts        # Wrappers: authApi = { login, me, ... }
│   ├── store/                 # Jotai atoms (client state only)
│   ├── utils/
│   │   ├── env.ts             # ONLY reader of import.meta.env (Zod validated)
│   │   ├── queryKeys.ts       # All TanStack Query keys
│   │   ├── cn.ts              # clsx + tailwind-merge
│   │   └── hooks/
│   └── styles/
│       ├── globals.css        # Tailwind v4 @theme
│       └── tokens.css         # Design tokens (CSS variables)
└── tests/
    ├── visual/__snapshots__/  # Playwright
    └── e2e/
```

### 3.2 Import direction (strict one-way)

```
components → services
components → store
components → utils/hooks, utils/cn
routes → components
services → api
services → utils/env
(only) utils/env → import.meta.env
```

Forbidden: `components → api/types/api.generated.ts`, `services → components`, cross-surface component imports, `../../` relative paths (use `@/` alias).

### 3.3 Component rules

- **Named exports only.** Biome `noDefaultExport: "error"`. Exceptions: `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`.
- **300-line rule.** Files over 300 lines become a folder:
  ```
  components/<surface>/Dashboard/
  ├── main.tsx
  ├── StatsHeader.tsx
  ├── …
  ```
- Sub-components live next to `main.tsx`, not siblings.

### 3.4 Server state — TanStack Query v5

- All query keys centralized in `utils/queryKeys.ts` as a const tree with `_def` scopes for invalidation.
- Query functions live in `api/<domain>.ts`.
- `staleTime` set per domain, never globally.
- Mutations invalidate by key scope.
- Never inline key arrays in `useQuery`.

### 3.5 Client state — Jotai

- UI state (modals, wizard step, theme, draft form values persisted across navigations).
- **Never** store server data in Jotai. **Never** store UI state in Query.
- Cross-component shared state → lift to Jotai, not `useState` prop drilling.

### 3.6 Forms — React Hook Form + Zod

- Schemas in `services/validation/<domain>.ts`, type inferred via `z.infer`.
- Frontend validation = UX; backend validation = contract.
- `<FormMessage>` wrapper for field errors, no ad-hoc spans.

### 3.7 `openapi-fetch` client

- `api/client.ts`: singleton `createClient<paths>({ baseUrl, credentials: "include" })` + auth middleware reading access token.
- `api.generated.ts` regenerated by pre-commit when backend schemas change. Never hand-edit.
- Components use domain wrappers (`authApi.login(...)`), never the raw client.

### 3.8 Routing — TanStack Router (file-based)

- `routes/__root.tsx` = root layout (QueryClientProvider, JotaiProvider, Toaster).
- `routes/_authenticated/` = layout with `beforeLoad` auth guard that `throw redirect({ to: "/login", search: { returnTo: location.pathname }})`.
- Role guards in nested `beforeLoad` (`if (context.user.role !== "x") throw redirect({ to: "/403" })`).
- `createLazyFileRoute(...)` for heavy screens.
- **URL is source of truth** for filter/pagination state (`useSearch`, `navigate({ search })`).

### 3.9 Env vars

- Only `utils/env.ts` reads `import.meta.env`, validated via Zod at module load.
- All public vars prefixed `VITE_`.
- Never secrets on frontend.

### 3.10 Styling — Tailwind v4 CSS-first

- Design tokens in `styles/tokens.css` under `@theme { --color-...: ... }` + `:root` `light-dark(...)`.
- `cn()` helper (clsx + tailwind-merge) — never manual string concat.
- `shadcn/ui` components **copied in-repo** under `components/shared/ui/`, owned locally, updated manually.
- Inline `style={{}}` only for truly dynamic values (percentages, transforms).
- Animations via `motion/react`; respect `prefers-reduced-motion`.

### 3.11 WebSocket client

- `services/websocket/index.ts` wraps `reconnecting-websocket`.
- Incoming messages validated with Zod discriminated union; unknown types logged, never thrown.
- Dispatch state into Jotai atoms; components subscribe to atoms.
- On auth change (login/logout/impersonation): close and reopen with new token.

### 3.12 Testing

- **Vitest + React Testing Library** for unit/components. Role-based queries (`getByRole`, `getByLabelText`) — avoid `getByTestId` unless truly needed. Tests next to code (`Foo.tsx` + `Foo.test.tsx`). No component snapshot tests — they rot.
- Services: plain unit tests. Hooks: `renderHook` with QueryClientProvider wrapper. API wrappers: mock `client`, assert contract.
- **Playwright** visual regression — `tests/visual/__snapshots__/`. Desktop (1440×900) + mobile (390×844). Before snapshot: disable animations, preload fonts, `caret-color: transparent`. Snapshots updated only with reviewer approval (diff in PR).
- **Playwright** E2E — happy-path flows for auth, core domain actions.

### 3.13 Tooling configs

**tsconfig.json** — strict, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals/Parameters`, `paths: { "@/*": ["src/*"] }`, `jsx: "react-jsx"`.

**biome.json** — `noDefaultExport: "error"`, `noExplicitAny: "error"`, lineWidth 100, organizeImports on, ignores `dist`, `node_modules`, `src/api/types/api.generated.ts`, `src/routeTree.gen.ts`, `tests/visual/__snapshots__`.

**vite.config.ts** — plugins: `TanStackRouterVite`, `react`, `tailwindcss`. Alias `@ → src`. Dev server `127.0.0.1:5174 strictPort`.

**playwright.config.ts** — webServer runs `pnpm dev`, two projects (desktop, mobile), baseURL `http://localhost:5174`.

---

## 4. Project Root

### 4.1 `docker-compose.yml`

- `postgres:16` with healthcheck + volume.
- `mailhog` (ports 1025 SMTP, 8025 UI) for email dev.
- Start: `docker compose up -d`. Production uses managed DB (e.g., Neon).

### 4.2 `Makefile`

Targets: `flush-db` (drop+recreate+upgrade head), `init-db` (flush + seeds), `seed-dev`.

### 4.3 Root `package.json`

Exists only for husky (`"prepare": "husky"`). Engines `node >= 22`. Backend uses `uv`, not pnpm.

### 4.4 `.husky/pre-commit`

Runs in order (fast first):
1. Backend (if `backend/**.py` changed): `ruff check --fix`, `ruff format`, `pyright` strict, `pytest` unit only.
2. Frontend (if `frontend/src/**.{ts,tsx,css}` changed): `biome check --write`, `tsc --noEmit`, `vitest run --changed`.
3. OpenAPI drift check (warn local, enforce CI).
4. Re-stage linter rewrites.

Never use `--no-verify`. If it fails, fix and **make a new commit** (never amend).

### 4.5 CI (GitHub Actions)

- `backend.yml` — lint (ruff non-mutating + format check), typecheck (pyright strict), tests with coverage floor.
- `frontend.yml` — biome check, `tsc --noEmit`, vitest with coverage, Playwright visual + E2E on desktop + mobile.
- `openapi-drift.yml` — boots backend, regenerates `api.generated.ts`, diff must be empty.
- `docs-links.yml` — all relative links in `Docs/` resolve.
- `main` protected: all gates must pass, no force-push, no admin bypass.

---

## 5. Documentation (`Docs/`)

```
Docs/
├── index.html                    # Entry listing all specs
├── global/
│   ├── specs.md                  # Global architecture + shared patterns
│   ├── decisions.md              # Cross-cutting decisions + OPEN questions
│   └── diagrams.html             # ERD, state machines, route permission matrix
├── app/
│   ├── rights.md                 # Role permission matrix
│   └── <surface>/dev-spec.md     # Per surface: models, routes, controllers
└── RUN_STATE.md                  # Current dev environment status
```

Rule: before implementing a feature, read the matching spec. If an item is OPEN in `decisions.md`, ask the user before proceeding; update `decisions.md` with the answer.

> User indicated: we will create the `Docs/` folder together later. **Do not scaffold it now.**

---

## 6. Cheatsheet (what to apply immediately when scaffolding)

| Aspect | Pattern |
|---|---|
| Async | Everything async (`asyncpg`, `httpx`); no `time.sleep` in requests |
| DB in tests | Real ephemeral Postgres, SAVEPOINT isolation, no mocks |
| Errors | Domain exceptions only; handlers translate to HTTP |
| External I/O | Handler + Provider + Protocol, instantiated once on `app.state` |
| Logging | structlog, request_id bound, never log secrets |
| Auth | JWT access + refresh rotation; refresh in HttpOnly cookie; role guards |
| Types (py) | `list[str]`, `str \| None`; no `Any`, no `# type: ignore` |
| Tests (py) | polyfactory, 85%+ controllers/daos, 70%+ routers |
| Forms (fe) | RHF + Zod; schemas in `services/validation/` |
| API client (fe) | openapi-fetch + generated types + domain wrappers |
| Routing (fe) | File-based TanStack Router; URL is source of truth; lazy-load heavy |
| State (fe) | Query for server, Jotai for client, never mix |
| Components | Named exports, 300-line rule, one-way imports |
| Styling | Tailwind v4 CSS-first + tokens.css; no inline styles except dynamic |
| Commits | Conventional commits; each commit passes pre-commit alone; one feature per PR |

---

## 7. Initialization order (when user asks)

1. `docker-compose.yml` (postgres + mailhog)
2. `Makefile` (db targets)
3. Root `package.json` + husky + `.husky/pre-commit`
4. `backend/` — `pyproject.toml`, `core/`, `main.py`, `alembic/`, `tests/conftest.py`
5. `backend/CLAUDE.md`
6. `frontend/` — `package.json`, `vite.config.ts`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `playwright.config.ts`, `src/{main.tsx,utils/env.ts,utils/queryKeys.ts,utils/cn.ts,api/client.ts,styles/}`
7. `frontend/CLAUDE.md`
8. Root `CLAUDE.md`
9. `.claude/{settings.local.json,skills/,commands/,agents/}`
10. `.github/workflows/` CI gates
11. `Docs/` — **only after the user asks, and after we co-design the folder**
