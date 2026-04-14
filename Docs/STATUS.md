# STATUS

> Read on session start. Update on session end.

**Last updated:** 2026-04-14
**Active phase:** Phase 7 closed → **next is Phase 8 (Ledger, Cronjob, Contract Lifecycle)**
**Plan:** `Docs/plans/2026-04-13-debt-app-implementation-plan.md`

---

## Done

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

## Next up — Phase 8: Ledger, Cronjob, Contract Lifecycle

Plan reference: plan lines 2313+. Spec: `Docs/specs.md` §7–§8.

Big phase. Tasks (roughly):
1. **8.1** — `debt_event` ledger table + enum + migration.
2. **8.2** — Ledger service: post events, replay to recompute balance.
3. **8.3** — Wire payment validation on `weekly_debt`/`debt_payment`/`buyout` categories → ledger events (unblock `_check_category_supported` in `payment_controller.py`).
4. **8.4/8.5** — Cronjob (APScheduler): weekly interest tick + missed-period late penalty.
5. **8.6** — Buyout flow (approve + settle).
6. **8.7** — Breach + forgive transitions.
7. **8.8** — Mid-contract addition + surprise penalty.
8. Client — contract detail ledger view, buyout/forgive/addition UI.

### Suggested subagent split

- Sonnet A — 8.1 + 8.2 (ledger model + service).
- Sonnet B (after A) — 8.3 (payment wiring) **parallel** with Sonnet C (8.4/8.5 cronjob).
- Sonnet D (after B+C) — 8.6/8.7/8.8 controllers + routers.
- Sonnet E — client UI.

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
