# STATUS

> Read on session start. Update on session end.

**Last updated:** 2026-04-14
**Active phase:** Phase 10 closed → **v0.1.0 tagged**. 10.7 scaffolded, 10.9 documented.
**Plan:** `Docs/plans/2026-04-13-debt-app-implementation-plan.md`

---

## Done

- **Phase 10.7** — Playwright visual regression scaffold (`client/e2e/visual.spec.ts`, `playwright.config.ts`, login fixture). Baselines captured on first run via `pnpm test:e2e:update` against a locally seeded stack.
- **Phase 10.9** — Hosting playbook `DEPLOY.md`: Hetzner CX22 single-host docker compose + Caddy + R2 nightly backups, update + rollback flow.
- **Phase 10** — Polish & Tests Retrofit:
  - `utils/ledger.replay_events` pure helper extracted; `recompute_balance` delegates.
  - Pytest retrofit: 21 unit tests (finance/rolling/periods/ledger); integration tests scaffolded but skipped (aiosqlite incompat with self-FK `use_alter=True` + Postgres enum types → needs real postgres fixture).
  - Vitest retrofit: pinned `vitest@^2.1.9` (Vite 5 compat), 17 unit tests across `debtContractsApi`, `notificationsApi`, `notificationsStore`.
  - UI primitives: `EmptyState`, `ErrorState`, `Skeleton`, `Modal` (focus-trap, Esc close, focus restoration, `aria-modal`).
  - Empty/error/loading states on dashboard (goddess+sub), contract lists, blacklist, pending validations, payment history, pending adjustments, sub detail sections.
  - Phase-8 dialogs + edit/reject/forgive modals refactored onto `Modal` base.
  - Mobile-first grids on goddess dashboard; `type="button"`, aria-labels, `role="status"` on live amounts.
  - Makefile: `cd client && pnpm vitest run` (fixed zsh `--` quoting).
- **Phase 9** — Notifications, Dashboards, Admin:
  - `notification` table + `InProcessPublisher` + WS `/ws/notifications?token=` with exponential backoff client hook, bell UI with badge/drawer.
  - `notify()` helper wired across payment, debt, blacklist, cron controllers.
  - `GET /goddess/dashboard` + `GET /sub/dashboard` backend with late-payment detection (rolling + contract), total_drained/total_sent aggregates.
  - Goddess + sub dashboard routes with stat cards, late-payment list, active-contract cards with progress bars, recent payments.
  - `/goddess/subs/:subId` per-sub detail view (rolling + contracts + payments sections).
  - Theme toggle (system/dark/light) persisted via `PATCH /me/preferences`, pre-hydration script in index.html.
  - Admin console: generic `/admin/{entity}` CRUD over 11 entities (users/goddesses/invitations/payment_methods/declarations/rolling_tributes/debt_contracts/blacklist_entries/notifications/debt_events/contract_adjustments), client sidebar + table + modal form.
- **Phase 8** — Ledger, cronjob, contract lifecycle:
  - `debt_event` ledger + `utils/ledger.py` (event replay, two-place quantize, buyout close).
  - Payment validate emits `payment_applied` / `buyout_paid` events; buyout closes contract.
  - `CronController.run_daily` + APScheduler @ 08:00 Europe/London; `POST /admin/cron/run-now`.
  - Late detection via `utils/periods.current_period_index` + ledger replay; idempotent via unique period-bound key.
  - Blacklist (breach cascades contracts → breached, revokes refresh tokens, snapshots balance; forgive reinstates).
  - Surprise penalty + mid-contract adjustments (mode-gated: disabled/dom_controlled/sub_approval_required).
  - Buyout intent endpoint + client panel; sub/goddess UI for all of the above.
- **Phase 7** — Signature & PDF:
  - `services/storage/` with `aiobotocore`-backed R2 adapter + fake filesystem fallback + factory switcher (no `r2_account_id` → Fake).
  - `services/pdf/generator.py` WeasyPrint + Jinja2, template `contract.html` (Playfair Display + Source Serif Pro, terms table, GBP formatting, signature inline base64 PNG).
  - `sign_as_sub` renders signed PDF, uploads to `contracts/{goddess_id}/{contract_id}.pdf`, stores object key in `signed_pdf_url` + `signed_pdf_sha256`, audit row.
  - `POST /debts/{id}/sign` accepts `{signature_png_b64}`. `GET /debts/{id}/pdf` returns 302 to 15-min presigned download (owner check).
  - Client `SignaturePad` (react-signature-canvas wrapper), `ContractSignRoute`, "Sign contract" + "Download signed PDF" buttons on `ContractDetailRoute`, `downloadContractPdfApi`.
- **Phase 6** — Debt contracts & negotiation:
  - `debt_contract`, `debt_contract_version`, `debt_contract_audit` tables (self-FK `current_version_id` via `use_alter=True`) + enums (`InterestPeriod`, `PaymentFrequency`, `LatePenaltySeverity`, `MidContractAdditionMode`, `DebtContractStatus`, `DebtContractEventType`).
  - `utils/finance.py` — pure Decimal `monthly_rate` (AER), `period_rate`, `simulate`, `exit_due`, `severe_warning`.
  - `DebtContractDao` + `DebtContractController` full state machine: propose (goddess/sub), counter_propose (one-round rule via `round_no`), accept/reject counter, sign, close_as_goddess, get, list_for_viewer, list_audit. Every transition writes a `debt_contract_audit` row.
  - Routers: all 12 endpoints incl. stateless `POST /debts/simulate`.
  - Client: `ContractFormRoute` with debounced live simulation (recharts LineChart + severe-warning banner), `ContractDetailRoute` (status chip, terms, projection, actions, audit log), `GoddessContractsRoute` / `SubContractsRoute`, Home picker cards.
  - Playwright smoke-tested goddess flow: new contract → propose → detail view renders projection + audit.
- **Phase 1** — Foundation: docker infra (Postgres + Mailhog), `make` targets, pre-commit, CI green, `make init-dbs` seeds.
- **Phase 2** — Auth: login/logout, refresh, password reset via Resend, goddess + admin accounts seeded, `EmailStr` loosened for localhost dev.
- **Phase 3** — Invitations: create/list/public landing/signup, entry tribute amount on invitation, pending-tribute CTA on sub dashboard.
- **Phase 5** — Rolling tributes:
  - `rolling_tribute` table (unique per sub) + alembic migration.
  - `RollingTributeDao`, `utils/rolling.py` (Europe/London aware deadline + amount_due + days_late).
  - `RollingController` + router `/goddess/subs/{sub_id}/rolling` (GET/PUT/DELETE).
  - `PaymentController.validate` wired to `mark_paid` on `rolling` category; rolling unblocked in `_UNSUPPORTED_CATEGORIES`.
  - Client `RollingEditorRoute` + `RollingForm` + `RollingReadonlyPanel`; reachable via `Manage rolling` picker on home.
  - Smoke-tested end-to-end via Playwright (save → computed next deadline + amount_due render correctly).
- **Phase 4** — Payment methods + declarations:
  - Goddess `payment_method` CRUD with drag reorder (`@dnd-kit`), soft-delete via `enabled=false`.
  - `payment_declaration` + `payment_allocation` tables with enums + indices.
  - Declare/edit/cancel as sub, record/validate/reject/recategorise as goddess, auto-promote sub from `pending_entry_tribute` on entry validation.
  - UI: `PaymentFormRoute`, `PaymentHistoryRoute`, `PendingValidationsRoute`, `RecordPaymentRoute`.
  - Role-aware dashboard + layout.

### Infra quality baseline (2026-04-14)

- **Typecheck swapped mypy → pyright strict** (commit `1dc9315`), all errors cleared (`80e83f2`).
- `datetime.utcnow()` replaced repo-wide with `datetime.now(UTC).replace(tzinfo=None)` (naive UTC, matches column types).
- `make check` green: ruff + ruff format + pyright strict + eslint + tsc + vite build.

---

## Next up — post-v0.1.0

All planned phases 1–10 shipped. Outstanding:

- **10.7 baselines** — snapshot PNGs not yet captured; run `pnpm test:e2e:update` against a running stack + seed and commit.
- **10.9 execution** — provision Hetzner CX22 and follow `DEPLOY.md` when ready to go live.
- Integration pytest suite needs a real Postgres fixture before it can run; aiosqlite cannot host `debt_contract`'s self-FK with `use_alter=True` + Postgres enum types.

---

## Known gates / carry-over

- `PaymentCategory.weekly_debt|debt_payment|buyout` still blocked in `payment_controller.py:_check_category_supported`. Wire through debt-contract-aware validation in Phase 8 (tribute events).
- `utils/rolling.py:current_cycle_deadline` returns naive UTC; the rolling-out schema now marks it tz-aware before emitting (`controllers/rolling_controller.py` `_to_out`). Other endpoints may need the same fix when they compute scheduled-time displays.
- No tests until Phase 10. Do NOT add pytest/vitest/Playwright test files yet (Playwright *usage* via MCP for manual verification is fine).
- Seed data: `server/seeds/bootstrap.py` bootstraps goddess + admin. Keep deterministic.

---

## Session workflow reminder

See root `CLAUDE.md` → **Orchestration workflow**. TL;DR:

1. Opus reads this file + plan, decides slice.
2. Dispatch Sonnet subagents (parallel when independent) with self-contained prompts.
3. Opus verifies: Playwright walkthrough + `make check` green + `/docs` spot-check.
4. Opus commits (Conventional Commits, English, no Claude co-author).
5. Update this file before ending session.
