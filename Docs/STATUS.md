# STATUS

> Read on session start. Update on session end.

**Last updated:** 2026-04-14
**Active phase:** Phase 5 closed → **next is Phase 6 (Debt Contracts & Negotiation)**
**Plan:** `Docs/plans/2026-04-13-debt-app-implementation-plan.md`

---

## Done

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

## Next up — Phase 6: Debt Contracts & Negotiation

Plan reference: plan lines 2169–2253. Spec: `Docs/specs.md` §6.

Subtasks (serial due to coupling — model must land first):
1. **Task 6.1 — Model + migration** — `debt_contract`, `debt_contract_version` (snapshot per counter), `debt_contract_audit` (transition log), all enums, `current_version_id` FK, `sub_initiated` bool.
2. **Task 6.3 — `utils/finance.py`** — `monthly_rate`, `period_rate`, `simulate`, `exit_due`, `severe_warning` (pure `Decimal` math).
3. **Task 6.2 — DAO + state-machine controller** — every transition from spec §6.2 as a controller method. Enforce one-round negotiation via `round_no` on version.
4. **Task 6.4 — Routers** — all endpoints listed in plan (`POST /goddess/subs/{id}/debts`, counter-propose, accept/reject, simulate, list, etc.).
5. **Task 6.5 — Client** — `ContractFormRoute` (with `recharts` live simulation + severe-warning banner), `ContractReviewRoute` (diff), `ContractSignRoute` (signature placeholder — real canvas lands in Phase 7).

### Suggested subagent split

- Sonnet A — Task 6.1 (model + enums + migration + schemas + `models/__init__.py`).
- Sonnet B (after A) — Task 6.3 (`utils/finance.py`) **parallel** with Sonnet C.
- Sonnet C (after A) — Tasks 6.2 + 6.4 (DAO, controller state machine, router, register in main).
- Sonnet D (after B+C) — Task 6.5 (client).
- Opus — Playwright golden-path walk, `make check`, commits per task.

---

## Known gates / carry-over

- `PaymentCategory.weekly_debt|debt_payment|buyout` still blocked in `payment_controller.py:_check_category_supported`. Unblock in Phase 6 once debt contracts exist.
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
