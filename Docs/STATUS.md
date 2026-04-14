# STATUS

> Read on session start. Update on session end.

**Last updated:** 2026-04-14
**Active phase:** Phase 6 closed → **next is Phase 7 (Signature & PDF)**
**Plan:** `Docs/plans/2026-04-13-debt-app-implementation-plan.md`

---

## Done

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

## Next up — Phase 7: Signature & PDF

Plan reference: plan lines 2256+. Spec: `Docs/specs.md` §7.

1. **Task 7.1 — R2 storage adapter** — Cloudflare R2 client + presigned URL helper.
2. **Task 7.2 — Signature canvas** — `ContractSignRoute` with HTML canvas signature capture, base64 PNG upload.
3. **Task 7.3 — PDF generation** — WeasyPrint template for signed contract, stored in R2, `signed_pdf_url` + `signed_pdf_sha256` populated on `sign_as_sub`.
4. **Task 7.4 — Wire into state machine** — `sign_as_sub` controller method calls PDF service, updates contract fields, writes audit.

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
