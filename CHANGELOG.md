# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/), the project uses [Semantic Versioning](https://semver.org/), and commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Added
- **Phase-wave-2 backend foundation** (single Alembic migration `3eebe0a46e45`):
  - **C1** `kink_category` + `kink_item` tables + `sub_kink_rating` with `KinkRating(hard_limit|soft_limit|curious|loves|fetish_need|not_set)` and `uq_sub_kink_rating_sub_item`. `kink_item.slug` is unique per `(slug, goddess_id)` to allow per-goddess custom items. Seed `seeds/kinks.py` populates 8 categories and 44 canonical items, idempotent; wired into `seed_admin_and_goddess()`.
  - **D3** `sub_safeword` table (PK = `sub_id`, FK → `user.id CASCADE`), `SubSafewordIn/Out` schemas, `SubSafewordController`, 3 routes: `POST /sub/profile/safeword` (upsert), `GET /sub/profile/safeword` (sub self), `GET /goddess/subs/{sub_id}/safeword` (goddess view).
  - **F1** `journal_entry` table with `JournalMood(great|good|neutral|low|bad|numb|overwhelmed)`, `body` + optional `photo_r2_key`, goddess-side `read_by_goddess_at` + `goddess_comment`. DAO exposes create + list + mark-read + set-comment; no body-mutation path (immutability guard via omission).
  - **I1** `wishlist_item` table with `WishlistStatus(open|cancelled|fulfilled)`, `WishlistCreatedBy(goddess|sub)`, `target_amount Numeric(12,2)`, per-item `sub_id` for personal gifts. `PaymentCategory.wishlist` + `AllocationTargetType.wishlist_goal` enum extensions. DAO `compute_collected(item_id)` correlates validated allocations via subquery.
  - **Fix** latent `paymentcategory` PG enum bug: `profile_change_fee` value was declared in the Python enum (P1.6) but never added to the PG enum type; migration now `ALTER TYPE … ADD VALUE IF NOT EXISTS 'profile_change_fee'` alongside the new `wishlist` + `wishlist_goal` values.
- **Phase-wave-1 backend foundation** (single Alembic migration `1de5e6292627`):
  - **A1** `payment_webhook_event` table + provider/result enums (`throne|paypal|revolut|cashapp` × `pending|matched|unmatched|duplicate|error`), unique `(provider, provider_event_id)` idempotency key. `services/ingest/matcher.py` resolves sub via 3-priority lookup (`payment_handle` → reference username → reference email); `controllers/ingest_controller.py` wraps it in an idempotent `IngestController.ingest_event()` that rejects non-GBP. `PaymentDeclaration.source` enum extended with `ingested`.
  - **B1** `sub_profile` side table keyed `user_id PK FK→user.id`, fields `real_name|age|gender|pronouns|location|timezone|joined_empire_at|ownership_status`. `Gender(male|female|non_binary|other)` + `OwnershipStatus(free|owned|in_training|collared|blackmailed|released)` enums. `InvitationController.consume()` now creates a default `sub_profile` row in the same transaction as the new `User`.
  - **D1** `sub_limit` + `sub_trigger` tables, `LimitKind(hard|soft)` + `LimitSeverity(low|medium|high)` enums. `acknowledged_by_goddess_at` on limits for sign-off workflow.
  - **E1** `ritual` + `ritual_occurrence` tables. `RitualFrequency(daily|weekly|custom)` with `custom_days_bitmask` + optional `deadline_time`, point economy columns (`points_on_complete|points_on_miss`). `OccurrenceStatus(pending|completed|missed|rejected|submitted)` with unique `(ritual_id, date)` gate for daily cron `bulk_create_for_date`.
  - **G1** `toy_item` table. `ToyCategory(restraint|impact|vibrator|plug|cage|gag|clothing|collar|other)`, `ToyProposedBy(sub|goddess)`, `approved` gate, reserved `lock_code_enc bytea` for phase J.
  - **H1** `debt_contract` gets 3 new columns: `clauses_json JSONB default '[]'::jsonb`, `review_at timestamp?`, `renewal_policy text default 'none'`. `RenewalPolicy(none|reminder|auto_extend)` enum registered. `DebtContractOut` schema unchanged so the UI contract is preserved.
  - **J1** `goddess_kek` table (one DEK per goddess, AES-256-GCM-wrapped by root KEK). `services/crypto/root_kek.py` loads `ROOT_KEK_B64`, generates per-goddess 32-byte DEKs, wraps/unwraps with a 12-byte nonce tagged by `root_kek_version`. `services/crypto/goddess_kek.py:ensure_goddess_kek(session, goddess_id)` idempotent. Bootstrap seeds the goddess KEK when `ROOT_KEK_B64` is configured; gracefully skips otherwise.
- **A5** YouPay widget: `components/payments/YouPayWidget.tsx` renders a deep-link button (default) or iframe (opt-in via `VITE_YOUPAY_IFRAME_ALLOWED="true"`) when a payment method named "YouPay" is selected on `/sub/payments/new`. `services/payments/youpay.ts` builds the `youpay.com.au/pay?amount=&ref=&currency=GBP` URL; `youpay_ref` query param on return auto-populates the reference field.
- Roadmap prep: `cryptography` + `pillow` server deps (Phase J, B4). Env stubs for R2 (sub photos / toys / vault), root KEK + version, Throne webhook / polling. `client/src/assets/goddess/` scaffold folder. `Docs/blackmail_threat_model.md` DRAFT stub (K1 gate).

### Changed
- Roadmap: every `client/src/pages/…` path rewritten to `client/src/routes/…` to match `client/CLAUDE.md` folder convention — no more drift for subagents.
- Replaced 10 generated SVG avatars with 8 AI-illustrated PNG avatars; `AvatarKey.accent_1/accent_2` remain as enum slots but fall back to the default image. Seed data uses only the available art keys.
- Contract preview page: what-if simulator applies the event at the current payment period (not period 1), preserving paid rows, and shows the before/after comparison in a modal with red highlights on changed rows. `ScheduleTable` marks paid periods green with a dot indicator.
- Unified contract totals: `Total interest` and `Total to pay` are now derived from the live simulation (not `min_payment × duration`) and rendered as StatPills alongside `Period rate` / `Monthly rate` on every page using `SimulationChart`. Removed the divergent naive-math tiles from `ContractHeaderSummary`.

### Fixed
- `GET /payments/subs` (goddess sub picker) now returns `first_name`, `last_name`, and `avatar_key`, so goddess-moderated profile changes show immediately in the UI.

### Added
- **P1.1** base64 signature + on-demand PDF: `signature_b64` column replaces `signed_pdf_url`/`signed_pdf_sha256`; `GET /debts/{id}/pdf[?draft=1]` regenerates via WeasyPrint and streams inline; `services/storage/*` removed.
- **P1.3** redesigned contract PDF template: A4 with 8 named sections, full repayment schedule, framed signature block (Europe/London `signed_at`), draft watermark variant.
- **P1.6** avatars + goddess-moderated profile changes: `AvatarKey` enum, 10 seeded SVGs, `payment_handle` on `User` (sub-editable), `ProfileChangeRequest` workflow (approve / reject / set fee — fee paths tied to a special `profile_change_fee` `PaymentDeclaration`), goddess review UI at `/goddess/profile-change-requests`, sub edit UI on `/profile`. `UserOut` now carries `payment_handle`.
- **P1.7** goddess dashboard charts: `GET /goddess/dashboard/charts` returns pre-aggregated monthly revenue, method breakdown, subs-by-status, top-5 subs, 30-day late-rate, and contract-state counts. Client renders with recharts + `ChartPanel`, colours bound to `tokens.css`.
- **P1.8** goddess contract preview page at `/goddess/contracts/:id/preview`: header summary, full schedule table, what-if simulator calling `/debts/simulate`, balance decay chart, DRAFT PDF export button.
- **P0 foundation pass** (audit-driven from Malverse + Calidra):
  - `client/src/utils/env.ts` — only file allowed to read `import.meta.env`; zod schema fails fast on missing/malformed `VITE_*` vars.
  - `client/src/lib/queryKeys.ts` — typed TanStack Query key factory organised by domain; every inline key migrated.
  - `GET /healthz` liveness probe; `openapi_url`/`docs_url`/`redoc_url` forced to `None` in prod.
  - `RequestIdMiddleware` generates/echoes `X-Request-ID`; structlog rewires logging (json in staging/prod, console in dev/test) with `request_id` bound into contextvars per request.
  - Password pepper: `base64(hmac-sha256(PASSWORD_PEPPER, plain))` pre-argon2 hash; dual-verify on login transparently rehashes legacy rows.
  - `RateLimiter` Protocol with `MemoryRateLimiter` / `RedisRateLimiter` impls, toggled by `RATE_LIMITER_BACKEND` + `REDIS_URL`; slowapi route decorators preserved.
  - `make sync-types` + CI `api-types-drift` job fail if `client/src/types/api.generated.ts` drifts from live `/openapi.json`.
  - Makefile `help`, `install`, `quality`, `feed-dbs` composite targets with `## description` annotations.
  - Postgres healthcheck in `docker-compose.yml`.
- `APP_ENV` setting (`dev` | `test` | `staging` | `prod`). Prod auto-enables `Secure` cookies, `SameSite=strict`, and HSTS — no manual toggle.
- Rate limiting (`slowapi`) on `/auth/login`, `/auth/password-reset/request`, `/auth/password-reset/confirm`, `/signup`, and `GET /invite/{token}`.
- `SecurityHeadersMiddleware` — CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS (prod only).
- `admin_action` audit log table with DAO + migration; impersonation and admin CRUD mutations are recorded.
- Typed Swagger response schemas for every `/admin/*` entity (`AdminRow*` + generic `AdminListOut`).
- Postgres-backed integration test suite (22 tests) via `testcontainers`: auth flow, rate limit, admin CRUD, impersonation, contract state machine, blacklist cascade.
- `CONTRIBUTING.md`, `CHANGELOG.md`.

### Changed
- Refresh token moved from JSON body to `debt_refresh` HttpOnly cookie on `/auth/login`, `/auth/refresh`, `/auth/logout`. Body fallback retained for legacy clients.
- Admin generic CRUD hardened: per-entity `forbidden_fields` deny-list blocks `id`, `password_hash`, `role`, `goddess_id`, `created_at` from PATCH/POST; `role` changes refused for the `User` entity.
- `debt_controller.py`, `dashboard_controller.py`, `payment_controller.py` split into package folders (`controller.py` + `helpers.py`). Public imports preserved through re-export shims.
- Dev admin/goddess bootstrap credentials moved from `Settings` to constants in `server/seeds/bootstrap.py` — no longer env-provided.
- CORS middleware: `allow_methods` and `allow_headers` tightened from `["*"]` to explicit lists.
- `PASSWORD_RESET_TTL_MINUTES` default aligned to 60 (`Docs/specs.md` §4.2).

### Removed
- Hardcoded `admin_password` / `goddess_password` defaults from `core/config.py` and their values from `server/.env.example` and `README.md`.

### Security
- Argon2id password hashing retained with defaults memory=64MB, time=3, parallelism=4.
- Generic admin CRUD no longer accepts arbitrary role/password_hash/goddess_id changes.
- Refresh tokens are HttpOnly, not accessible from JavaScript, and `Secure` + `SameSite=strict` in prod.

## [0.1.0] — 2026-04-14

First tagged build. Implementation phases 1–10.

### Added
- Phase 1 — Docker infra (Postgres + Mailhog), Make targets, pre-commit, CI green, `make init-dbs` bootstraps admin + goddess + 11 seeded subs in distinct states.
- Phase 2 — Auth: login, logout, refresh, password reset via Resend; argon2id hashing; role/status guards.
- Phase 3 — Invitation flow: create/list/public landing/signup, entry tribute, pending-tribute CTA.
- Phase 4 — Payment methods (drag-reorder, soft-delete), declarations, allocations, validate/reject/recategorise, goddess direct-record.
- Phase 5 — Rolling tributes (`rolling_tribute` table, Europe/London deadline math, `days_late` multiplier, unblock on validation).
- Phase 6 — Debt contracts: tables + enums, AER financial math (`utils/finance.py`), 12-endpoint state machine with one-round counter-proposal rule, per-transition audit rows, live simulation chart.
- Phase 7 — Signature + PDF: WeasyPrint contract template, R2 storage adapter + fake-filesystem fallback, canvas signature, SHA-256 integrity, presigned download URLs (15 min TTL).
- Phase 8 — Ledger + daily cron: `debt_event` ledger, APScheduler @ 08:00 Europe/London, idempotent late detection, blacklist cascade, surprise penalties, mid-contract adjustments (mode-gated), buyout intent flow.
- Phase 9 — Notifications, dashboards, admin: in-process WS publisher with exponential-backoff reconnect, bell + drawer, goddess + sub dashboards with late lists and progress bars, theme toggle, generic `/admin/{entity}` console over 11 entities.
- Phase 10 — Polish + tests retrofit: 21 pytest unit tests, 17 vitest unit tests, UI primitives (`EmptyState`, `ErrorState`, `Skeleton`, `Modal` with focus-trap), empty/error/loading states across all surfaces, mobile-first grids, Playwright visual scaffold, Hetzner deploy playbook.

### Infrastructure
- Pyright strict typecheck replaces mypy.
- `datetime.utcnow()` purged repo-wide in favour of `datetime.now(UTC).replace(tzinfo=None)`.

[Unreleased]: https://github.com/qbecb1zen/Debt_collector/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/qbecb1zen/Debt_collector/releases/tag/v0.1.0
