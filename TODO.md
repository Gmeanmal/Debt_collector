# TODO

Legend: **P0** = infra/foundation (do first, unblocks everything else). **P1** = product features. **P2** = polish / later.

---

## P0 — Foundation & DevX (priority 0)

Stolen from Malverse_Games + Calidra Platform audits. Order = impact × effort. 9 of 12 shipped on 2026-04-15. Remaining 3 are test-tier work (phase 10) + one optional swap.

### P0.1 — `utils/env.ts` with Zod validation ✅ DONE (2026-04-15)

### P0.2 — Request ID middleware + structlog contextvars ✅ DONE (2026-04-15)

### P0.3 — TanStack Query key factory ✅ DONE (2026-04-15)

### P0.4 — `/healthz` endpoint + hide OpenAPI in prod ✅ DONE (2026-04-15)

### P0.5 — openapi-typescript pipeline + CI drift check ✅ DONE (2026-04-15)

- `client/src/types/api.generated.ts` generated and committed.
- `make sync-types` + `make check-types-drift` wired.
- CI job `api-types-drift` boots the server and fails if the generated file drifts.

### P0.6 — Real-Postgres test fixture with SAVEPOINT pattern ⏸ DEFERRED to phase 10

Project rule: no tests during phases 1–9. Revisit when the test suite is retrofitted.

### P0.7 — Playwright visual regression ⏸ DEFERRED to phase 10

Same reason as P0.6 — phase-10 test work.

### P0.8 — Password pepper layer ✅ DONE (2026-04-15)

Repo uses argon2 (not bcrypt as TODO said); pepper + base64 pre-hash still applies the same way. Dual-verify transparently upgrades legacy rows.

### P0.9 — Rate limiter Protocol swap ✅ DONE (2026-04-15)

slowapi kept for route decorators; new generic `RateLimiter` Protocol + Memory/Redis impls selected via `RATE_LIMITER_BACKEND`.

### P0.10 — Biome swap 🟡 OPTIONAL (skipped)

Current ESLint + Prettier setup works fine. Low ROI unless lint time becomes painful.

### P0.11 — docker-compose infra verification ✅ DONE (2026-04-15)

Postgres + Mailhog present with matching ports and healthcheck.

### P0.12 — Makefile help + composite targets ✅ DONE (2026-04-15)

---

## P1 — Product features (next after foundation)

These depend on P0 being solid (typed API, real tests, visual regression baseline).

### P1.1 — Base64 signature instead of storing the signed PDF ✅ DONE (2026-04-15)

`signed_pdf_url`/`signed_pdf_sha256` dropped; `signature_b64` added (Text). Sign controller stores the data URI; `GET /debts/{id}/pdf[?draft]` regenerates and streams inline. `services/storage/*` removed. Client sign route posts `signature_b64`; download gate is now `signed_at`.

### P1.2 — Throne API integration for automatic payment ingestion 🚫 OUT OF MVP (2026-04-16)

External payment-app duplication. See `Docs/plan_post_wave7.md` P0 for rationale.

### P1.3 — Redesign signed-contract PDF template ✅ DONE (2026-04-15)

A4 redesign with 8 named sections, full repayment schedule, print-ready margins/pagination, framed signature block with Europe/London `signed_at`, goddess + sub info blocks, and DRAFT watermark variant.

### P1.4 — Payment ingestion via goddess's own payment methods 🚫 OUT OF MVP (2026-04-16)

External payment-app duplication. See `Docs/plan_post_wave7.md` P0.

### P1.5 — YouPay iframe integration 🚫 OUT OF MVP (2026-04-16)

External payment-app duplication. See `Docs/plan_post_wave7.md` P0. "YouPay" stays available as a free-text manual method name.

### P1.6 — Avatars + sub profiles controlled by the goddess ✅ DONE (2026-04-15)

10 seeded SVG avatars + `AvatarKey` enum on `User`. `payment_handle` (max 64) sub-editable; surfaced on `UserOut`. `ProfileChangeRequest` workflow (sub submits, goddess approves/rejects/sets fee; fee-gated changes apply on payment validation). Goddess sub listings render avatar + first/last name. UUIDs stay admin-only.

### P1.7 — Goddess dashboard: charts and styled aggregates ✅ DONE (2026-04-15)

`GET /goddess/dashboard/charts` exposes pre-aggregated DTOs: monthly revenue (12 months, rolling/one-off/contract split), method breakdown, subs-by-status, top-5 subs, 30-day late-rate sparkline, active/completed/breached contract counts. Client renders via recharts + `ChartPanel`, colours sourced from `tokens.css` (CSS-var bridge for runtime recharts fills).

### P1.8 — Improve contract preview ✅ DONE (2026-04-15)

Goddess-only `/goddess/contracts/:id/preview` route: header summary, full schedule table (period #, due date, amount, running balance), what-if simulator posting to `/debts/simulate`, recharts balance decay chart, and DRAFT PDF export via `GET /debts/{id}/pdf?draft=1`. Linked from `ContractDetailRoute`.

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
