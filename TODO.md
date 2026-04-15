# TODO

Legend: **P0** = infra/foundation (do first, unblocks everything else). **P1** = product features. **P2** = polish / later.

---

## P0 — Foundation & DevX (priority 0)

Stolen from Malverse_Games + Calidra Platform audits. Order = impact × effort. Do top-down. 12 items.

### P0.1 — `utils/env.ts` with Zod validation (frontend, low effort)

- Create `client/src/utils/env.ts`. Only file allowed to read `import.meta.env`.
- Zod schema parses at module load → fail-fast on missing/malformed vars.
- Export typed `env` constant. Replace every `import.meta.env.*` call site.
- Ref: Malverse `frontend/src/utils/env.ts`.

### P0.2 — Request ID middleware + structlog contextvars (backend, low effort)

- Add `server/middleware/request_id.py`: generate UUID per request or read `X-Request-ID`; echo on response.
- Bind into `structlog.contextvars` so every log line carries `request_id`.
- Update `core/logging.py` to use structlog (JSON prod, pretty dev).
- Ref: Malverse `backend/middleware/request_id.py` + `core/logging.py`.

### P0.3 — TanStack Query key factory (frontend, low effort)

- Create `client/src/lib/queryKeys.ts` with typed per-domain factory (`queryKeys.sub.payments(id)`).
- Replace every inline `["foo","bar"]` key across hooks/services.
- Enables surgical invalidation, kills typo-split caches.
- Ref: Malverse `frontend/src/utils/queryKeys.ts`.

### P0.4 — `/healthz` endpoint + hide OpenAPI in prod (backend, trivial)

- `GET /healthz` → `{"status":"ok"}` — liveness probe.
- `FastAPI(openapi_url="/openapi.json" if settings.env == "development" else None, docs_url=None if prod)`.
- Security hardening: don't expose schema to random scanners.

### P0.5 — openapi-typescript pipeline + CI drift check (medium effort)

- Install `openapi-typescript`. Generate `client/src/types/api.generated.ts` from server `/openapi.json`.
- `make sync-types` target (skill already exists: `sync-types`).
- CI job: regenerate, `git diff --exit-code` → fail on drift.
- Swap hand-written request/response types for generated ones.
- Consider `openapi-fetch` client to replace raw axios calls (typed end-to-end).

### P0.6 — Real-Postgres test fixture with SAVEPOINT pattern (medium effort, phase-10 prep)

- `server/tests/conftest.py`: session-scoped ephemeral `debt_collector_test` DB, run Alembic once.
- Per-test fixture: nested transaction (SAVEPOINT). `session.commit()` commits savepoint only; teardown rolls back outer tx.
- No SQLite swap. No per-test drop/recreate. ~100× faster.
- Add polyfactory for SQLModel auto-factories. Replace any hand-written fixture.
- Ref: Malverse `backend/tests/conftest.py`.

### P0.7 — Playwright visual regression (medium effort)

- `client/tests/visual/` with Playwright. Two viewports: `1440×900` desktop, `390×844` mobile.
- Per-surface snapshot vs `Docs/*.html` mockups.
- CI runs in official container `mcr.microsoft.com/playwright:<version>-jammy` → pixel-perfect.
- Snapshots committed under `__snapshots__/`.

### P0.8 — Password pepper layer (backend, low effort, security)

- `core/security.py`: wrap raw password in `hmac.digest(PEPPER, raw, "sha256")` → base64 → bcrypt.
- Add `PASSWORD_PEPPER` to `server/.env.example` + settings.
- Defense-in-depth: pepper blocks offline rainbow tables; base64 blocks bcrypt null-byte truncation.
- Migration path: re-hash on next login (dual-verify for old hashes until rotated).
- Ref: Calidra `auth_controller._get_base64_password`.

### P0.9 — Rate limiter Protocol swap (backend, low effort)

- Refactor `core/rate_limit.py` to `RateLimiter` Protocol.
- Two impls: `MemoryRateLimiter` (dev/test) + `RedisRateLimiter` (prod, when needed).
- Pick in `core/config.py` via `RATE_LIMITER=memory|redis` env var.
- `check(key, limit, window) -> RateLimitResult` with `Retry-After`.

### P0.10 — Biome swap (frontend, optional, medium effort)

- Replace `eslint.config.js` + prettier with Biome (`biome.json`).
- Enforce `noDefaultExport: "error"`, `useImportType: "error"`, `noExplicitAny: "error"`.
- One tool, ~10× faster. Skip if eslint setup works fine — low ROI.

### P0.11 — docker-compose infra verification (trivial)

- Confirm `docker-compose.yml` has Postgres + Mailhog (SMTP 1025, UI 8025). Add Mailhog if missing.
- Optional: add pgAdmin on 5050 for DB GUI.
- Health-checks on Postgres for reliable CI bring-up.

### P0.12 — Makefile help + composite targets (DevX, trivial)

- Add `## comment` annotations to every target. Default `make` target greps them: `@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk ...`.
- Composite targets: `make install` (server+client), `make quality` (lint+type+test), `make reset-dbs`, `make feed-dbs`.
- Ref: Calidra root `Makefile`.

---

## P1 — Product features (next after foundation)

These depend on P0 being solid (typed API, real tests, visual regression baseline).

### P1.1 — Base64 signature instead of storing the signed PDF

- Drop `signed_pdf_url` and `signed_pdf_sha256` on `DebtContract`.
- Add `signature_b64` (TEXT) — PNG encoded as base64 data URI.
- Migration to swap columns.
- `sign_contract` controller: store `signature_b64`, stop calling storage service.
- `GET /debts/{id}/pdf` endpoint: regenerate on the fly via `generate_contract_pdf(...)` and stream inline (`Response(pdf, media_type="application/pdf")`).
- Seeds: replace `signed_pdf_url=…` with a 1×1 transparent PNG encoded as base64.
- Remove `services/storage/*` if no other route still uses it after this change.

### P1.2 — Throne API integration for automatic payment ingestion

- Investigate Throne API / webhook (auth, payload format, HMAC signature).
- Store one "Throne connection" per goddess (token + account id).
- Webhook endpoint `/webhooks/throne` → verify signature → match sub by Throne handle → create auto-validated `PaymentDeclaration` with `source = goddess_recorded`.
- Goddess dashboard: "Auto-detected via Throne" badge on payments received via webhook.
- Polling fallback if no webhook available.

### P1.3 — Redesign signed-contract PDF template

- Redesign `server/services/pdf/templates/contract.html`: clear hierarchy, named sections (parties, principal, schedule, late-penalty clauses, exit, signatures).
- Add full repayment schedule (one row per period with due date + amount due + interest).
- Print-ready style (A4, margins, pagination, footer with contract id + sha).
- Framed signature block with `signed_at` in Europe/London timezone.
- Include goddess header (logo + display_name) and full sub info block.

### P1.4 — Payment ingestion via goddess's own payment methods (receipt webhooks)

- For each supported goddess-side `PaymentMethodType`, wire provider-specific webhook (PayPal IPN, Revolut Merchant, Cash App, etc.).
- `PaymentWebhookEvent` table for idempotency (provider event id).
- Payload → sub matching: by payment handle (see P1.6) or free-text reference.
- Auto-create validated `PaymentDeclaration` + immediate allocation.
- Goddess UI to enable/disable auto-ingest per method and view event log.

### P1.5 — YouPay iframe integration

- Check YouPay terms: is iframe embedding allowed? (X-Frame-Options / CSP on YouPay's side).
- If allowed: widget embedded on sub's "Declare payment" page, prefilled with amount + reference.
- Otherwise: deep-link fallback (open YouPay in new tab with query params).
- Contact YouPay support if documentation unclear.

### P1.6 — Avatars + sub profiles controlled by the goddess

- Seed 10 default avatars (in `client/src/assets/avatars/`) + "default" avatar assigned at sign-up.
- `avatar_key` field on `User` (enum or FK to `Avatar` table).
- Only goddess can edit a sub's `avatar_key`, `first_name`, `last_name`, `display_name`, `notes`.
- `ProfileChangeRequest` table: sub requests change → goddess approves / rejects / proposes "cost" (e.g. 50 GBP). If sub accepts cost, generate special `PaymentDeclaration` "profile_change_fee" → change applied on validation.
- Sub **can** edit exactly one field: their `payment_handle` (Throne / PayPal username). Add to sign-up form + `/sub/profile`.
- Everywhere goddess lists/views subs → avatar + first name + last name (never UUID).
- `payment_handle` is matching key for Throne webhook (see P1.2).

### P1.7 — Goddess dashboard: charts and styled aggregates

- Add dashboard page with:
  - Monthly revenue (line chart: rolling + tributes + contracts).
  - Breakdown by payment method (pie/donut).
  - Subs by status (stacked bar).
  - Top 5 subs by generated revenue (leaderboard).
  - 30-day late rate (sparkline).
  - Active vs completed vs breached contracts (progress bars).
- Library: recharts or visx (ESM, lightweight, tailwind-friendly).
- Style consistent with `tokens.css`, no inline colours.

### P1.8 — Improve contract preview

- `/goddess/contracts/:id/preview` page (and sub-side before signing):
  - Header summary (principal, duration, frequency, rate).
  - Full schedule: table with period #, due date, amount due, running total.
  - "Late payment" / "early buyout" / "breach" simulator (use existing `/debts/simulate`).
  - Balance decay chart over time.
  - "Draft" PDF export (same template as P1.3, with "DRAFT" watermark).

### P1.9 — More goddess photos + multi-tenant later

- `client/src/assets/goddess/` (or `public/goddess/`) folder with multiple photos (hero, accent, cards).
- `<GoddessPhoto variant="hero|portrait|accent" />` component to centralise usage.
- Integration on: landing, goddess dashboard, public invitation page, login.
- Multi-tenant: for now every goddess points at same image pool. Later, `GoddessAsset` table with per-tenant upload and override.

---

## P2 — Later / nice-to-have

- Provider fakes pattern (`RecordingEmailProvider`) once test suite starts (phase 10).
- Coverage floors in CI: 85% controllers/daos, 70% routers.
- Background worker discipline via FastAPI `lifespan` with cancel-on-shutdown.
- WebSocket hub + heartbeat if real-time payment updates become a feature.
