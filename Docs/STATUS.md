# STATUS

> Read on session start. Update on session end.

**Last updated:** 2026-04-14
**Active phase:** Phase 4 closed → **next is Phase 5 (Rolling Tributes)**
**Plan:** `Docs/plans/2026-04-13-debt-app-implementation-plan.md`

---

## Done

- **Phase 1** — Foundation: docker infra (Postgres + Mailhog), `make` targets, pre-commit, CI green, `make init-dbs` seeds.
- **Phase 2** — Auth: login/logout, refresh, password reset via Resend, goddess + admin accounts seeded, `EmailStr` loosened for localhost dev.
- **Phase 3** — Invitations: create/list/public landing/signup, entry tribute amount on invitation, pending-tribute CTA on sub dashboard.
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

## Next up — Phase 5: Rolling Tributes

Plan reference: plan lines 2117–2165.

Deliverables:
1. `rolling_tribute` table (unique on `sub_id`): amount, deadline_day enum, deadline_time, late_multiplier_per_day, paused, notes, last_paid_at.
2. Alembic migration with unique index on `sub_id`.
3. `RollingTributeDAO`: `get_for_sub`, `upsert`, `mark_paid`.
4. `utils/rolling.py`: `current_cycle_deadline`, `days_late`, `amount_due` (Europe/London aware, naive-UTC out).
5. Controller + router `/goddess/subs/{sub_id}/rolling` (GET, PUT upsert, DELETE → amount=0).
6. Wire `PaymentController.validate` to call `mark_paid` when allocation `target_type == rolling_cycle`.
7. Unblock `PaymentCategory.rolling` in `_UNSUPPORTED_CATEGORIES` (`server/controllers/payment_controller.py:31`) once rolling records exist.
8. Client: standalone `RollingEditorRoute.tsx` (full `SubDetailRoute` arrives in Phase 9).

### Suggested subagent split (parallelisable)

- Agent A (Sonnet) — model + migration + DAO + `utils/rolling.py`.
- Agent B (Sonnet) — controller + router + OpenAPI docs.
- Agent C (Sonnet) — client route + hook + service (after A+B merged so types sync).
- Opus orchestrator — wires `PaymentController.validate` hook, removes rolling from `_UNSUPPORTED_CATEGORIES`, runs Playwright walkthrough + `make check` + commits.

---

## Known gates / carry-over

- `PaymentCategory.rolling|weekly_debt|debt_payment|buyout` currently blocked in controller (`payment_controller.py:_check_category_supported`). Unblock progressively: `rolling` in Phase 5, the rest in Phase 6.
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
