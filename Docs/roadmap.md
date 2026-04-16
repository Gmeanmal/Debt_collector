# Debt Collector — Roadmap

**Date:** 2026-04-16
**Companion doc:** `specs.md` (authoritative design)
**Purpose:** executable task list for Sonnet subagents dispatched by the Opus orchestrator.

---

## 0. How to read this roadmap

- **61 tasks** grouped into **13 phases (A–M)**.
- Each task is a self-contained brief: goal, files, acceptance criteria, dependencies, subagent hint.
- Tasks inside a phase are mostly parallelizable (look at `Deps` to be sure).
- Phases are mostly sequential; `A`, `B`, `C`, `E`, `F`, `G`, `H`, `M` can run partly in parallel once `J` is done where it is a dependency.
- **Gated phases** (`K`, `L`) must not start until the orchestrator confirms legal review is signed off.

**Conventions**

- All new backend code lives under the layered structure `routers → controllers → daos → models`, with `services/` for external adapters. No business logic in routers.
- All new frontend code respects: 300-line cap per component, named exports, one-way imports, no inline styles, tokens from `tokens.css`.
- Every new route: `summary`, `description`, `response_model`, `status_code`, `tags`, `responses={}`. Pydantic schemas use `Field(..., description="…", examples=[…])`.
- Every model change ships its Alembic migration in the same slice (see `new-migration` skill).
- English only, GBP, Europe/London. UUIDs never exposed to `goddess` / `sub`.
- Conventional Commits: `<type>(<scope>): <summary>`. Scopes available: `server|client|infra|docs|db|auth|contracts|rollings|payments|admin|notif|ui|profile|kinks|limits|rituals|journal|toys|vault|devices|crypto|ingest`.
- No tests during phases 1–9 of the original plan still applies — tests retrofit happens after this roadmap completes.

**Status legend:** 🟢 ready · 🟡 blocked by dep · 🔴 gated (legal)

---

# PHASE A — Residual core (integrations & assets)

Finishes scope already in `TODO.md`: payment ingestion infrastructure + goddess photo assets.

### A1 — `payment_webhook_event` table + idempotency service ✅

- **Scope:** `server`, `db`, `ingest`.
- **Goal:** shared landing table for every provider webhook with unique `(provider, provider_event_id)` constraint and a generic ingestion service that resolves sub → creates validated `PaymentDeclaration + Allocation` with `source='ingested'`.
- **Files:**
  - `server/models/payment_webhook_event.py` (new)
  - `server/daos/payment_webhook_dao.py` (new)
  - `server/controllers/ingest_controller.py` (new)
  - `server/services/ingest/matcher.py` (new — resolve sub from `payment_handle` or reference)
  - Alembic migration
- **Spec refs:** §24.1, §24.3.
- **Acceptance:** unit path (manual `curl` OK during phase 1–9) — same event fired twice only creates one declaration; unmatched event leaves `result='unmatched'`, matched auto-creates `source='ingested'` validated declaration.
- **Deps:** —
- **Subagent hint:** backend-feature.

### A2 — Throne connection model + credentials store ✅

- **Scope:** `server`, `db`, `auth`, `ingest`.
- **Goal:** per-goddess Throne connection (API token + account id). Token stored via the envelope pattern (interim: `Fernet` until J lands, swap later).
- **Files:**
  - `server/models/throne_connection.py`
  - `server/daos/throne_dao.py`
  - `server/services/ingest/throne/client.py` — HTTP client with timeouts, retries, no token in logs.
  - Alembic migration
  - `server/routers/goddess/integrations.py` — `GET/POST /goddess/integrations/throne`
- **Spec refs:** §24.2 Throne, §25.1 (interim crypto note).
- **Acceptance:** goddess can save + read back connection via `/goddess/integrations/throne`; token value never echoed in response, only `is_configured: bool` + last 4 chars.
- **Deps:** A1.
- **Subagent hint:** backend-feature.

### A3 — Throne webhook + polling fallback 🟡

- **Scope:** `server`, `ingest`.
- **Goal:** `POST /webhooks/throne` verifies HMAC signature, persists event, calls matcher service. Polling fallback every 15 min if webhook unavailable (config flag `THRONE_POLLING_ENABLED`).
- **Files:**
  - `server/routers/webhooks/throne.py`
  - `server/services/ingest/throne/webhook.py` — signature verification (HMAC-SHA256, header `X-Throne-Signature`).
  - `server/services/ingest/throne/poller.py` — APScheduler job.
  - Frontend goddess inbox tile: `client/src/routes/goddess/WebhookInbox.tsx` (new) + `GET /goddess/webhook-inbox`.
- **Spec refs:** §24.2, §24.3.
- **Acceptance:** goddess saves Throne connection → live Throne payment appears as validated declaration in sub history within 1 min; unmatched events appear in `/goddess/webhook-inbox` with a "Assign to sub" action.
- **Deps:** A1, A2.
- **Subagent hint:** backend-feature + frontend-feature parallel.

### A4 — PayPal / Revolut / Cash App webhook modules 🟡

- **Scope:** `server`, `ingest`.
- **Goal:** three parallel adapters following the Throne template. Each: signature verification, persistence to `payment_webhook_event`, sub matching, auto-declaration.
- **Files:**
  - `server/routers/webhooks/paypal.py`, `server/services/ingest/paypal/*`
  - `server/routers/webhooks/revolut.py`, `server/services/ingest/revolut/*`
  - `server/routers/webhooks/cashapp.py`, `server/services/ingest/cashapp/*`
  - Extend `goddess_integration` model with per-provider toggles.
- **Spec refs:** §24.2, §24.4.
- **Acceptance:** each provider can be enabled independently; end-to-end test via provider sandbox (manual during phases 1–9).
- **Deps:** A1.
- **Subagent hint:** **3 parallel backend-feature subagents**, one per provider.

### A5 — YouPay iframe / deep-link component ✅

- **Scope:** `client`, `payments`.
- **Goal:** embed YouPay on sub's "Declare payment" page if T&C permit iframe; otherwise a deep-link button prefilled with amount + reference.
- **Files:**
  - `client/src/components/payments/YouPayWidget.tsx` (new, ≤200 lines)
  - `client/src/services/payments/youpay.ts` (URL builder, feature detection)
  - Docs: short comment in the component describing the T&C decision (iframe vs deep-link).
- **Spec refs:** §24.2 YouPay.
- **Acceptance:** sub opens declare-payment page with a YouPay method selected → sees either the iframe or a "Pay via YouPay →" button; after return, reference is copied to the declaration form.
- **Deps:** —
- **Subagent hint:** frontend-feature.

### A6 — Goddess photo assets + `<GoddessPhoto>` component 🟢

- **Scope:** `client`, `ui`.
- **Goal:** consolidate goddess imagery into `client/src/assets/goddess/` with variants `hero`, `portrait`, `accent`, `card`. Component `<GoddessPhoto variant="…" />` centralises usage. Integrated on landing, goddess dashboard, public invitation page, login.
- **Files:**
  - `client/src/assets/goddess/*.webp` (add)
  - `client/src/components/goddess/GoddessPhoto.tsx` (new)
  - Replace direct imports on: `LandingRoute`, `GoddessDashboard`, `InvitationRoute`, `LoginRoute`.
- **Spec refs:** §11.2, §28.
- **Acceptance:** no raw `<img>` referencing `assets/goddess/*` outside `GoddessPhoto`; lighthouse LCP on landing ≥ 90.
- **Deps:** —
- **Subagent hint:** frontend-feature.

---

# PHASE B — §16 Identity extension

### B1 — `sub_profile` side table + migration ✅

- **Scope:** `server`, `db`, `profile`.
- **Goal:** create the `sub_profile` table (PK `user_id` FK) with fields from §16.1: `real_name`, `age`, `gender`, `pronouns`, `location`, `timezone`, `joined_empire_at`, `ownership_status`.
- **Files:** `server/models/sub_profile.py`, `server/daos/sub_profile_dao.py`, Alembic migration.
- **Spec refs:** §16.1.
- **Acceptance:** `sub_profile` row auto-created on every new sub via signup (default values: `joined_empire_at=now()`, `ownership_status='free'`). Backfill migration creates rows for existing subs.
- **Deps:** —
- **Subagent hint:** migration-writer + backend-feature.

### B2 — Signup form + sub self-edit API 🟡

- **Scope:** `server`, `client`, `profile`.
- **Goal:** extend signup with identity fields (age with ≥18 gate, gender, pronouns, location, timezone auto-detected); add `GET/PATCH /profile` covering sub-editable fields.
- **Files:** `server/routers/profile.py`, `server/controllers/profile_controller.py`, `client/src/routes/profile/ProfileEditRoute.tsx`, `client/src/components/invitation/SignupForm.tsx`.
- **Spec refs:** §16.1, §16.4.
- **Acceptance:** sub can update editable fields; `real_name` edits after first-set route through existing `ProfileChangeRequest` flow (P1.6).
- **Deps:** B1.
- **Subagent hint:** backend-feature + frontend-feature.

### B3 — Ownership status enum + transitions ✅

- **Scope:** `server`, `db`, `profile`.
- **Goal:** add `status_event` table; expose `PATCH /goddess/subs/{id}/status` with server-side transition validation (§16.3 rules); reject illegal transitions with 422.
- **Files:** `server/models/status_event.py`, `server/controllers/profile_controller.py` (extend), `server/services/profile/status_machine.py` (new — pure function), Alembic migration.
- **Spec refs:** §16.3.
- **Acceptance:** 422 on illegal transition; legal transitions create a `status_event` row; status visible on goddess sub card.
- **Deps:** B1.
- **Subagent hint:** backend-feature.

### B4 — Photo upload + R2 storage service 🟢

- **Scope:** `server`, `profile`.
- **Goal:** R2 client service, `sub_photo` table, `POST /profile/photos` (multipart, max 5 MB, EXIF stripped, MIME guarded), file stored under `<goddess_id>/<sub_id>/<uuid>.ext`.
- **Files:**
  - `server/services/storage/r2.py` (new — async S3-compatible client)
  - `server/models/sub_photo.py`
  - `server/controllers/photo_controller.py`
  - Alembic migration
  - `server/core/config.py` — add `R2_BUCKET_SUB_PHOTOS`, endpoint, keys.
- **Spec refs:** §16.2.
- **Acceptance:** upload succeeds, row created with `status='pending'`, EXIF removed (verify with `pillow`), file downloadable via presigned URL (TTL 10 min).
- **Deps:** —
- **Subagent hint:** backend-feature + external-service-adapter.

### B5 — Photo approval queue (goddess UI) 🟡

- **Scope:** `server`, `client`, `profile`.
- **Goal:** `GET /goddess/photo-queue`, `POST /goddess/photos/{id}/approve|reject`; frontend queue page with preview, approve/reject, rejection reason.
- **Files:**
  - `server/routers/goddess/photos.py`
  - `client/src/routes/goddess/PhotoQueueRoute.tsx`
  - `client/src/components/goddess/PhotoReviewCard.tsx`
- **Spec refs:** §16.2.
- **Acceptance:** rejected photo is soft-deleted; approved photo appears on goddess sub profile card; admin force-delete works.
- **Deps:** B4.
- **Subagent hint:** backend-feature + frontend-feature parallel.

### B6 — Goddess sub profile card 🟡

- **Scope:** `client`, `profile`.
- **Goal:** consolidated card on `/goddess/subs/:id` showing avatar + top approved photo + identity fields + ownership status + `real_name` (goddess-only).
- **Files:** `client/src/components/goddess/SubProfileCard.tsx`, `client/src/routes/goddess/SubDetailRoute.tsx` (integrate).
- **Spec refs:** §16.1, §28.
- **Acceptance:** real_name rendered only when role = goddess; sub self-view masks it; component ≤300 lines.
- **Deps:** B2, B5.
- **Subagent hint:** frontend-feature.

---

# PHASE C — §17 Kinks

### C1 — Kink taxonomy models + seed ✅

- **Scope:** `server`, `db`, `kinks`.
- **Goal:** `kink_category`, `kink_item` models + `sub_kink_rating` + seed data for the 8 categories listed in §17.1. Safety flag on `pain_endurance` items.
- **Files:** `server/models/kink_*.py`, `server/seeds/kinks.py`, Alembic migration.
- **Spec refs:** §17.1, §17.2.
- **Acceptance:** `make init-dbs` seeds the taxonomy; re-running is idempotent (upsert by slug).
- **Deps:** —
- **Subagent hint:** migration-writer + backend-feature.

### C2 — Sub rating API ✅

- **Scope:** `server`, `kinks`.
- **Goal:** `GET /profile/kinks` (matrix), `PUT /profile/kinks/{item_id}` (upsert rating with `rating` + `note`).
- **Files:** `server/routers/kinks.py`, `server/controllers/kinks_controller.py`, `server/daos/kink_rating_dao.py`.
- **Spec refs:** §17.2.
- **Acceptance:** rating stored; safety-flagged item rated `curious+` returns warning DTO field to display client-side confirmation.
- **Deps:** C1.
- **Subagent hint:** backend-feature.

### C3 — Custom kink proposal flow ✅

- **Scope:** `server`, `client`, `kinks`.
- **Goal:** sub proposes custom `kink_item` (`is_custom=true, approved=false`); `GET /goddess/kinks/proposals`, `POST /goddess/kinks/proposals/{id}/approve|reject`.
- **Files:** `server/routers/goddess/kinks.py`, `client/src/routes/goddess/KinkProposalsRoute.tsx`.
- **Spec refs:** §17.3.
- **Acceptance:** approved item becomes available to every sub of the approving goddess.
- **Deps:** C1.
- **Subagent hint:** backend-feature + frontend-feature.

### C4 — Sub kink matrix UI 🟡

- **Scope:** `client`, `kinks`.
- **Goal:** `/profile/kinks` matrix (category sections, rating selector, safety warning icon).
- **Files:** `client/src/routes/profile/KinksRoute.tsx`, `client/src/components/kinks/KinkMatrix.tsx`, `KinkRow.tsx`, `RatingPicker.tsx`.
- **Spec refs:** §17.4.
- **Acceptance:** virtualised for ≥200 items; safety items show confirmation modal before saving `curious+`; each component ≤300 lines.
- **Deps:** C2.
- **Subagent hint:** frontend-feature.

### C5 — Goddess kink overview (heatmap) 🟡

- **Scope:** `server`, `client`, `kinks`.
- **Goal:** read-model `GET /goddess/kinks/overview` returning per-item aggregated counts by rating; heatmap UI.
- **Files:** `server/controllers/kinks_overview_controller.py`, `client/src/routes/goddess/KinkOverviewRoute.tsx`, `client/src/components/kinks/KinkHeatmap.tsx`.
- **Spec refs:** §17.4.
- **Acceptance:** heatmap renders within 300 ms on 20 subs × 80 items; colours from `tokens.css`.
- **Deps:** C2.
- **Subagent hint:** backend-feature + frontend-feature.

---

# PHASE D — §18 Limits, triggers, safewords (medical comes after J)

### D1 — `sub_limit` + `sub_trigger` models ✅

- **Scope:** `server`, `db`, `limits`.
- **Goal:** models, DAOs, migration.
- **Files:** `server/models/sub_limit.py`, `server/models/sub_trigger.py`, Alembic migration.
- **Spec refs:** §18.1, §18.2.
- **Acceptance:** creating a `sub_limit(kind='hard')` leaves `acknowledged_by_goddess_at=null`.
- **Deps:** —
- **Subagent hint:** migration-writer + backend-feature.

### D2 — Limits & triggers CRUD API ✅

- **Scope:** `server`, `limits`.
- **Goal:** sub CRUD on own limits + triggers; goddess read + `POST /goddess/subs/{id}/limits/{lid}/acknowledge`.
- **Files:** `server/routers/limits.py`, `server/controllers/limits_controller.py`.
- **Spec refs:** §18.1, §18.2.
- **Acceptance:** acknowledging a limit stamps `acknowledged_by_goddess_at`; red badge on goddess dashboard disappears.
- **Deps:** D1.
- **Subagent hint:** backend-feature.

### D3 — `sub_safeword` model + API ✅

- **Scope:** `server`, `limits`.
- **Goal:** one-row-per-sub safeword record (word, signal, emergency contact); `GET/PUT /profile/safeword`; `GET /goddess/subs/{id}/safeword`.
- **Files:** `server/models/sub_safeword.py`, `server/routers/safeword.py`, Alembic migration.
- **Spec refs:** §18.4.
- **Acceptance:** displayed prominently on every `/goddess/subs/:id/*` page header.
- **Deps:** —
- **Subagent hint:** migration-writer + backend-feature.

### D4 — Limits & triggers UI (sub + goddess) 🟡

- **Scope:** `client`, `limits`.
- **Goal:** sub editor `/profile/limits`; goddess read-only panel with high-severity pinned banner; safeword always pinned in header.
- **Files:** `client/src/routes/profile/LimitsRoute.tsx`, `client/src/components/limits/*`, `client/src/components/layout/SafewordBanner.tsx`.
- **Spec refs:** §18.1–§18.4.
- **Acceptance:** hard limit not acknowledged → red badge next to sub in goddess sub list.
- **Deps:** D2, D3.
- **Subagent hint:** frontend-feature.

### D5 — Emergency-stop endpoint (scaffolding, no medical cross-refs yet) ✅

- **Scope:** `server`, `limits`.
- **Goal:** `POST /sub/panic` pauses rituals + tasks, sets `ownership_status='released'` (soft), notifies goddess with high-priority flag.
- **Files:** `server/routers/panic.py`, `server/controllers/panic_controller.py`, `server/services/panic/orchestrator.py`.
- **Spec refs:** §18.4.
- **Acceptance:** endpoint requires re-auth (`X-Confirm-Password` header verified), triggers notifications + state updates atomically.
- **Deps:** B3 (ownership transitions), E1 (rituals — to pause them).
- **Subagent hint:** backend-feature.

### D6 — `sub_medical` model shell (encryption deferred to J) ✅

- **Scope:** `server`, `db`, `limits`.
- **Goal:** define `sub_medical` with `*_enc bytea` columns + nulls permitted; do not expose read/write API yet (wait for J's envelope service).
- **Files:** `server/models/sub_medical.py`, Alembic migration.
- **Spec refs:** §18.3.
- **Acceptance:** model + migration merged; no controller or route exposed.
- **Deps:** —
- **Subagent hint:** migration-writer.

---

# PHASE E — §19 Rituals & Tasks

### E1 — `ritual` + `ritual_occurrence` models ✅

- **Scope:** `server`, `db`, `rituals`.
- **Goal:** models, DAOs, migration; `frequency` enum with `custom_days` bitmask.
- **Files:** `server/models/ritual.py`, `server/models/ritual_occurrence.py`, Alembic migration.
- **Spec refs:** §19.1.
- **Acceptance:** uniqueness `(ritual_id, date)` on occurrences.
- **Deps:** —
- **Subagent hint:** migration-writer + backend-feature.

### E2 — Daily cron job: ritual occurrence seeding ✅

- **Scope:** `server`, `rituals`, `notif`.
- **Goal:** at 00:00 Europe/London generate one `ritual_occurrence(status='pending')` per active ritual per day; end-of-day job flips `pending → missed`.
- **Files:** `server/services/cron/rituals.py`, wire into existing APScheduler.
- **Spec refs:** §8.4, §19.1.
- **Acceptance:** idempotent uniqueness key `(sub_id, date, ritual_id)`; rerunning the cron is a no-op.
- **Deps:** E1.
- **Subagent hint:** backend-feature.

### E3 — Ritual & task CRUD API ✅

- **Scope:** `server`, `rituals`.
- **Goal:** goddess CRUD on `ritual`; sub `POST /rituals/{occ_id}/complete` (with optional evidence); `task` CRUD (goddess create/cancel, sub submit); goddess approve/reject submitted tasks.
- **Files:** `server/routers/rituals.py`, `server/routers/tasks.py`, controllers + DAOs.
- **Spec refs:** §19.1, §19.2.
- **Acceptance:** evidence photo upload reuses R2 service (B4).
- **Deps:** E1, B4.
- **Subagent hint:** backend-feature.

### E4 — Sub `/today` dashboard 🟡

- **Scope:** `client`, `rituals`.
- **Goal:** single landing page for sub with today's rituals + open tasks + "write journal" CTA; inline evidence submission.
- **Files:** `client/src/routes/sub/TodayRoute.tsx`, `client/src/components/rituals/RitualCard.tsx`, `TaskCard.tsx`.
- **Spec refs:** §19.3, §28.
- **Acceptance:** rituals + tasks are completed inline without navigation; ≤300 lines per component.
- **Deps:** E3.
- **Subagent hint:** frontend-feature.

### E5 — Goddess `/goddess/review-queue` 🟡

- **Scope:** `client`, `rituals`.
- **Goal:** cross-sub queue of pending ritual occurrences + submitted tasks with bulk approve/reject.
- **Files:** `client/src/routes/goddess/ReviewQueueRoute.tsx`, `client/src/components/rituals/ReviewRow.tsx`.
- **Spec refs:** §19.3, §28.
- **Acceptance:** bulk actions batch into single API call.
- **Deps:** E3.
- **Subagent hint:** frontend-feature.

---

# PHASE F — §20 Journal / merits / aftercare

### F1 — `journal_entry` model + immutability guard ✅

- **Scope:** `server`, `db`, `journal`.
- **Goal:** model + migration; DB trigger OR controller-level guard preventing `UPDATE/DELETE` on body after creation (comment field is separately editable).
- **Files:** `server/models/journal_entry.py`, `server/daos/journal_dao.py`, Alembic migration.
- **Spec refs:** §20.1.
- **Acceptance:** attempt to edit body returns 409; goddess comment edit works.
- **Deps:** —
- **Subagent hint:** migration-writer + backend-feature.

### F2 — Journal API (sub write, goddess read + comment) ✅

- **Scope:** `server`, `journal`.
- **Goal:** `POST /journal`, `GET /journal` (sub self), `GET /goddess/subs/{id}/journal`, `PATCH /goddess/journal/{id}/comment`.
- **Files:** `server/routers/journal.py`, controllers.
- **Spec refs:** §20.1.
- **Acceptance:** goddess comment triggers notification to sub.
- **Deps:** F1.
- **Subagent hint:** backend-feature.

### F3 — `merit_event` model + auto-credits ✅

- **Scope:** `server`, `db`, `journal`.
- **Goal:** merit ledger + auto-credit hooks on `ritual_occurrence.completed`, `task.approved`, `ritual_occurrence.missed`, `task.rejected`. Per-ritual / per-task configurable points.
- **Files:** `server/models/merit_event.py`, `server/services/merits/credits.py`, wiring in `rituals_controller` + `tasks_controller`.
- **Spec refs:** §20.2.
- **Acceptance:** `points_balance` derived via `SUM(delta)`; concurrent completions don't double-credit (uniqueness key `(source_kind, source_id)`).
- **Deps:** E3.
- **Subagent hint:** backend-feature.

### F4 — Rewards / punishments tiers ✅

- **Scope:** `server`, `journal`.
- **Goal:** `reward_tier`, `punishment_tier` CRUD (goddess-only); redeem endpoint for sub (`POST /rewards/{id}/redeem`); invoke endpoint for goddess (`POST /punishments/{id}/invoke` — creates a task with the punishment body).
- **Files:** `server/routers/merits.py`, controllers, migration.
- **Spec refs:** §20.2.
- **Acceptance:** redeeming with insufficient balance returns 422; invoking a punishment creates a linked task.
- **Deps:** F3.
- **Subagent hint:** backend-feature.

### F5 — Journal & merits UI 🟡

- **Scope:** `client`, `journal`.
- **Goal:** `/journal` history (sub) + goddess journal reader + goddess rewards / punishments admin.
- **Files:** `client/src/routes/sub/JournalRoute.tsx`, `client/src/routes/goddess/JournalReaderRoute.tsx`, `MeritsAdminRoute.tsx`.
- **Spec refs:** §20, §28.
- **Acceptance:** sub cannot edit past entries; goddess can add/edit single comment per entry.
- **Deps:** F2, F4.
- **Subagent hint:** frontend-feature.

### F6 — Aftercare preferences 🟢

- **Scope:** `server`, `client`, `journal`.
- **Goal:** `sub_aftercare` one-row table; `GET/PUT /profile/aftercare`; rendered on goddess sub page after "Session complete" button (manual flag, cookie on goddess side).
- **Files:** `server/models/sub_aftercare.py`, `server/routers/aftercare.py`, `client/src/components/goddess/AftercarePanel.tsx`.
- **Spec refs:** §20.3.
- **Acceptance:** "Session complete" toggle opens the aftercare panel for 30 min, then auto-dismisses.
- **Deps:** B1.
- **Subagent hint:** backend-feature + frontend-feature.

---

# PHASE G — §21 Toys inventory

### G1 — `toy_item` model + migration ✅

- **Scope:** `server`, `db`, `toys`.
- **Goal:** model with category enum, `approved` flag, `proposed_by`, optional `lock_code_enc` (column added now, encryption deferred to J).
- **Files:** `server/models/toy_item.py`, migration.
- **Spec refs:** §21.1.
- **Acceptance:** migration ships; `lock_code_enc` column nullable, no write path yet.
- **Deps:** —
- **Subagent hint:** migration-writer.

### G2 — Toy CRUD + approval API ✅

- **Scope:** `server`, `toys`.
- **Goal:** goddess CRUD (`approved=true` immediately); sub propose (`approved=false`), goddess approve/reject.
- **Files:** `server/routers/toys.py`, controllers, DAO.
- **Spec refs:** §21.2.
- **Acceptance:** rejected sub proposal hard-deletes row; approved becomes visible on inventory view.
- **Deps:** G1.
- **Subagent hint:** backend-feature.

### G3 — Inventory UI (goddess + sub read-only) 🟡

- **Scope:** `client`, `toys`.
- **Goal:** `/goddess/subs/{id}/inventory` grouped by category, with photos from R2; sub `/profile/inventory` read-only.
- **Files:** `client/src/routes/goddess/InventoryRoute.tsx`, `client/src/components/toys/InventoryGrid.tsx`, `ToyCard.tsx`.
- **Spec refs:** §21.2, §28.
- **Acceptance:** photos lazy-loaded; add-item button hidden for sub if not allowed.
- **Deps:** G2, B4.
- **Subagent hint:** frontend-feature.

---

# PHASE H — Contract clauses & renewal

### H1 — `clauses_json` + `review_at` + `renewal_policy` columns ✅

- **Scope:** `server`, `db`, `contracts`.
- **Goal:** add columns to `debt_contract`; migration with backfill (`clauses_json='[]'`, `review_at=null`, `renewal_policy='none'`).
- **Files:** `server/models/debt_contract.py`, migration.
- **Spec refs:** §6.1, §6.8, §6.9.
- **Acceptance:** existing contracts unchanged behaviourally.
- **Deps:** —
- **Subagent hint:** migration-writer.

### H2 — Clauses editor (backend) + re-sign flow ✅

- **Scope:** `server`, `client`, `contracts`.
- **Goal:** typed clause editor in contract form (add/remove/sort); PDF template gets a "Clauses" section rendering `label` + `body`; re-signature flow triggered if clauses change after `signed_at`.
- **Files:** `server/controllers/contracts_controller.py` (extend), `server/services/pdf/contract_template.html`, `client/src/components/contracts/ClauseEditor.tsx`.
- **Spec refs:** §6.8.
- **Acceptance:** adding a clause after signature flips status to `PENDING_SUB_SIGNATURE` and clears `signed_at`; new `signature_b64` required to return to `ACTIVE`.
- **Deps:** H1.
- **Subagent hint:** backend-feature + frontend-feature.

### H3 — Renewal reminder cron + notification ✅

- **Scope:** `server`, `contracts`, `notif`.
- **Goal:** daily cron pushes a `review_reminder` notification to goddess 14 days before `review_at`; idempotent via unique `(contract_id, 'review_reminder')` notification type.
- **Files:** `server/services/cron/contracts.py` (extend existing), `server/models/notification.py` (add type enum value).
- **Spec refs:** §8.3, §6.9.
- **Acceptance:** re-running cron doesn't create duplicates; notification deep-links to contract preview.
- **Deps:** H1.
- **Subagent hint:** backend-feature.

### H4 — `auto_extend` renewal flow ✅

- **Scope:** `server`, `contracts`.
- **Goal:** cron clones a contract into `PENDING_SUB` with `review_at += duration` when `renewal_policy='auto_extend'` and `review_at` passed.
- **Files:** `server/services/cron/contracts.py` (extend).
- **Spec refs:** §6.9.
- **Acceptance:** new contract inherits fields minus ledger; original contract unchanged.
- **Deps:** H3.
- **Subagent hint:** backend-feature.

---

# PHASE I — Wishlist / tribute minimum / penalty rules

### I1 — `wishlist_item` model + category ✅

- **Scope:** `server`, `db`, `payments`.
- **Goal:** `wishlist_item` table, new `PaymentCategory=wishlist`, new `AllocationTargetType=wishlist_goal`, DAO + migration.
- **Files:** `server/models/wishlist_item.py`, `server/models/enums.py` (extend), migration.
- **Spec refs:** §7.1, §16.5.
- **Acceptance:** existing payment flows unchanged; new category validated in payment schema.
- **Deps:** —
- **Subagent hint:** migration-writer + backend-feature.

### I2 — Wishlist CRUD + auto-fulfil logic ✅

- **Scope:** `server`, `payments`.
- **Goal:** goddess CRUD + sub propose; when a `wishlist` allocation brings `collected >= target`, status flips to `fulfilled`, both notified.
- **Files:** `server/routers/wishlist.py`, controllers, DAO.
- **Spec refs:** §16.5.
- **Acceptance:** unit path verified manually; fulfilment is idempotent.
- **Deps:** I1.
- **Subagent hint:** backend-feature.

### I3 — Wishlist UI (goddess + sub) 🟡

- **Scope:** `client`, `payments`.
- **Goal:** goddess `/goddess/wishlist` (CRUD); sub `/wishlist` (browse + declare payment prefilled with wishlist category + target id).
- **Files:** `client/src/routes/goddess/WishlistRoute.tsx`, `client/src/routes/sub/WishlistRoute.tsx`, `client/src/components/wishlist/WishlistCard.tsx`.
- **Spec refs:** §28.
- **Acceptance:** sub declaring a wishlist payment auto-links to the item.
- **Deps:** I2.
- **Subagent hint:** frontend-feature.

### I4 — `tribute_minimum` + performance gauge (backend) ✅

- **Scope:** `server`, `client`, `payments`.
- **Goal:** `tribute_minimum` table (per sub) + dashboard gauge comparing `actual_this_period` vs `amount`.
- **Files:** `server/models/tribute_minimum.py`, `server/routers/goddess/tribute_minimum.py`, `client/src/components/goddess/TributeGauge.tsx`.
- **Spec refs:** §16.5.
- **Acceptance:** gauge colour = red if `actual < amount * grace_below_percent`.
- **Deps:** I1.
- **Subagent hint:** backend-feature + frontend-feature.

### I5 — `penalty_rule` + cron integration ✅

- **Scope:** `server`, `payments`, `rollings`, `contracts`, `rituals`.
- **Goal:** `penalty_rule` table + service consulted by rolling/contract/ritual crons before applying defaults; `cooldown_hours` guard.
- **Files:** `server/models/penalty_rule.py`, `server/services/penalty/engine.py`, migration.
- **Spec refs:** §16.5.
- **Acceptance:** firing a penalty twice within `cooldown_hours` is suppressed; rule `action='notify_only'` skips balance changes.
- **Deps:** E2, H3.
- **Subagent hint:** backend-feature.

---

# PHASE J — Crypto envelope & consent framework (prerequisite for K/L + medical)

### J1 — `goddess_kek` + root KEK config ✅

- **Scope:** `server`, `db`, `crypto`.
- **Goal:** root KEK in env (`ROOT_KEK_B64`), per-goddess KEK row wrapped by root KEK (rotation-safe format: `version || nonce || ciphertext`).
- **Files:** `server/core/config.py` (add `ROOT_KEK_B64`, rotation version), `server/models/goddess_kek.py`, migration + bootstrap in `seeds/`.
- **Spec refs:** §25.1.
- **Acceptance:** unit via interactive REPL — wrap/unwrap round-trips; rotation flag path tested.
- **Deps:** —
- **Subagent hint:** backend-feature.

### J2 — `services/crypto/envelope.py` ✅

- **Scope:** `server`, `crypto`.
- **Goal:** `encrypt(goddess_id, plaintext) -> (wrapped_key, iv, ciphertext)`, `decrypt(...)`. AES-256-GCM. DEK generated fresh per row.
- **Files:** `server/services/crypto/envelope.py`.
- **Spec refs:** §25.1, §25.2.
- **Acceptance:** ciphertext ≠ plaintext; tampering (flip 1 bit) raises; two calls give different ciphertexts; no keys in logs.
- **Deps:** J1.
- **Subagent hint:** backend-feature.

### J3 — Consent text + acceptance tracking ✅

- **Scope:** `server`, `db`, `crypto`.
- **Goal:** `consent_text` (versioned, markdown), `consent_acceptance`; helper `require_consent(slug)` decorator for routes.
- **Files:** `server/models/consent_*.py`, `server/services/consent/gate.py`, migration, seed initial versions for slugs `medical`, `blackmail_upload`, `device_connect`.
- **Spec refs:** §25.3.
- **Acceptance:** missing acceptance returns 428 with the consent text; accepting logs an `accepted_at`.
- **Deps:** J2.
- **Subagent hint:** backend-feature.

### J4 — Medical data read/write path (activates D6) 🟡

- **Scope:** `server`, `client`, `limits`.
- **Goal:** `GET/PUT /profile/medical` (sub + goddess, gated by `require_consent('medical')`); fields encrypted via envelope; UI in both dashboards; decryption is explicit (goddess clicks "Reveal" — logged in `admin_action`).
- **Files:** `server/routers/medical.py`, `client/src/routes/profile/MedicalRoute.tsx`, `client/src/components/goddess/MedicalRevealPanel.tsx`.
- **Spec refs:** §18.3, §25.
- **Acceptance:** admin CRUD endpoints deny READ on medical columns (delete allowed); goddess reveal event logged.
- **Deps:** J2, J3, D6.
- **Subagent hint:** backend-feature + frontend-feature.

---

# PHASE K — §22 Blackmail vault 🔴 (GATED — legal review required)

**Do not start until orchestrator confirms legal sign-off and threat model document exists.**

### K1 — Threat model + consent-text drafting 🔴

- **Scope:** `docs`, `vault`.
- **Goal:** `Docs/blackmail_threat_model.md` covering abuse vectors, revocation guarantees, UK Theft Act 1968 s. 21 analysis, GDPR erasure commitments. Draft versioned `consent_text` rows for `vault_upload` and `vault_revoke`.
- **Files:** `Docs/blackmail_threat_model.md`, seeds for consent text.
- **Spec refs:** §22, §25.3.
- **Acceptance:** orchestrator + goddess review and sign the doc (pair review commit).
- **Deps:** J3.
- **Subagent hint:** docs / Plan subagent.

### K2 — Client-side encryption library + upload flow 🔴

- **Scope:** `client`, `vault`, `crypto`.
- **Goal:** browser-side encryption (libsodium-js) keyed off goddess passphrase (Argon2id KDF); encrypted blob sent to server as opaque bytes; server never sees plaintext or derived key.
- **Files:** `client/src/services/vault/crypto.ts`, `client/src/services/vault/upload.ts`, `client/src/routes/goddess/VaultUploadRoute.tsx`.
- **Spec refs:** §22.1, §25.
- **Acceptance:** decryption requires passphrase re-entry each session (no localStorage caching).
- **Deps:** J2, K1.
- **Subagent hint:** frontend-feature + external-service-adapter.

### K3 — `blackmail_material` + consent events tables 🔴

- **Scope:** `server`, `db`, `vault`.
- **Goal:** models, DAO, API: `POST /vault/materials` (accepts ciphertext), `GET /vault/materials` (metadata only), `POST /vault/materials/{id}/revoke`.
- **Files:** `server/models/blackmail_*.py`, `server/routers/vault.py`, migration.
- **Spec refs:** §22.2.
- **Acceptance:** every upload creates a `consent_event` row referencing a specific `consent_text` version; revocation flips `revoked_at` and schedules hard-delete job.
- **Deps:** K2, J3.
- **Subagent hint:** backend-feature.

### K4 — Hard-delete job + revocation guarantees 🔴

- **Scope:** `server`, `vault`.
- **Goal:** background job purges R2 objects within 24h of `revoked_at`; writes `destroyed_at`; admin UI shows "destroyed" tombstones for audit.
- **Files:** `server/services/vault/gc.py`.
- **Spec refs:** §22.1, §25.4.
- **Acceptance:** after revocation, `GET /vault/materials/{id}` returns 410; R2 key verified absent.
- **Deps:** K3.
- **Subagent hint:** backend-feature.

### K5 — Contract-clause linkage 🔴

- **Scope:** `server`, `contracts`, `vault`.
- **Goal:** `clauses_json[type='blackmail_consent']` carries `linked_vault_id`; revocation flags the clause as `clause_invalidated`; goddess notified; contract stays `ACTIVE`.
- **Files:** `server/services/contracts/clauses.py`, event wiring.
- **Spec refs:** §22.3, §6.8.
- **Acceptance:** revocation of a vault item tied to a clause produces a single notification to the goddess.
- **Deps:** H2, K3.
- **Subagent hint:** backend-feature.

---

# PHASE L — §23 TechDom / device control 🔴 (GATED — per-vendor terms)

**Do not start until orchestrator confirms vendor T&C review and secrets vault (J) is live.**

### L1 — `device` + `device_permission_grant` + `device_event` 🔴

- **Scope:** `server`, `db`, `devices`.
- **Goal:** models, DAOs, migration; `access_token_enc`, `refresh_token_enc` stored via envelope.
- **Files:** `server/models/device*.py`, migration.
- **Spec refs:** §23.2.
- **Acceptance:** saving a token never logs plaintext; round-trip decrypt works.
- **Deps:** J2.
- **Subagent hint:** migration-writer + backend-feature.

### L2 — `DeviceAdapter` Protocol + Lovense adapter 🔴

- **Scope:** `server`, `devices`.
- **Goal:** `services/devices/base.py` Protocol (`connect`, `send_command`, `disconnect`, `refresh_token`); first concrete: `services/devices/lovense/adapter.py`.
- **Files:** as above.
- **Spec refs:** §23.3.
- **Acceptance:** adapter honours timeouts, retries, exponential backoff; test against Lovense sandbox (manual).
- **Deps:** L1.
- **Subagent hint:** external-service-adapter.

### L3 — Qiui Cellmate adapter 🔴

- **Scope:** `server`, `devices`.
- **Goal:** second concrete adapter using the same Protocol.
- **Files:** `services/devices/qiui_cellmate/adapter.py`.
- **Spec refs:** §23.3.
- **Acceptance:** same Protocol; sandbox test (manual).
- **Deps:** L2.
- **Subagent hint:** external-service-adapter.

### L4 — Goddess devices UI 🔴

- **Scope:** `client`, `devices`.
- **Goal:** `/goddess/subs/{id}/devices` list + connect wizard (OAuth for Lovense, manual token for Qiui) + command history + revoke-all.
- **Files:** `client/src/routes/goddess/DevicesRoute.tsx`, `client/src/components/devices/*`.
- **Spec refs:** §23.4.
- **Acceptance:** tokens never appear in UI after save; revoke-all issues `disconnect` to every adapter and flips rows to `revoked`.
- **Deps:** L1–L3.
- **Subagent hint:** frontend-feature.

---

# PHASE M — §24 Ingestion completion

### M1 — `goddess_integration` toggles UI 🟡

- **Scope:** `client`, `ingest`.
- **Goal:** goddess page `/goddess/integrations` to enable/disable each provider, see event log, test webhook.
- **Files:** `client/src/routes/goddess/IntegrationsRoute.tsx`, `client/src/components/integrations/ProviderCard.tsx`, `EventLogTable.tsx`.
- **Spec refs:** §24.4.
- **Acceptance:** disabling a provider stops new events being auto-matched; existing ones remain.
- **Deps:** A1, A4.
- **Subagent hint:** frontend-feature.

### M2 — Webhook inbox manual assignment 🟡

- **Scope:** `server`, `client`, `ingest`.
- **Goal:** unmatched events in `/goddess/webhook-inbox` get an "Assign to sub" action that creates the declaration + allocation retroactively with `source='ingested'`.
- **Files:** `server/routers/goddess/webhook_inbox.py`, `client/src/routes/goddess/WebhookInboxRoute.tsx`.
- **Spec refs:** §24.3.
- **Acceptance:** post-assignment, the event row is marked `matched` with `matched_declaration_id` set.
- **Deps:** A1, A3, A4.
- **Subagent hint:** backend-feature + frontend-feature.

---

## Task count

6 + 6 + 5 + 6 + 5 + 6 + 3 + 4 + 5 + 4 + 5 + 4 + 2 = **61**.

---

## Dispatch guidance (orchestrator-facing)

1. **Foundations first**: A1 unlocks A3, A4, M1, M2. B1 + B4 unlock most of Phase B and Phase G. J is a hard prerequisite for any encryption-bearing task (D6/J4, K*, L1).
2. **Parallelisable bundles** (safe concurrent subagents):
   - A3 + A4 + A5 + A6 after A1 merges.
   - C1+C2 chain // D1+D2 chain // E1+E2 chain — three parallel paths once B1 lands.
   - I1→I3 chain // H1→H2 chain — independent after Phase B/H schemas exist.
3. **After every phase**: orchestrator runs Playwright golden path + `make check`, updates `CHANGELOG.md [Unreleased]`, commits per phase (`feat(<scope>): …`), refreshes `Docs/diagrams.html` when flows change.
4. **Gated phases (K, L)** require an explicit orchestrator sign-off gate before any subagent is dispatched. Doc changes (K1) may begin earlier to prepare review.

End of roadmap.
