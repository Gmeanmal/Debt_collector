# Plan post-wave-7 — cleanup, finish, extend

**Date:** 2026-04-16
**Scope reference:** `memory/project_scope_cut.md` (decision 2026-04-16)
**Source:** `CHANGELOG.md` + `Docs/roadmap.md`

Two blocks, executed in order. **P0 is the gate** — no feature work until deferred scope is physically removed from the repo so subagents stop tripping over dead code paths. Phase K (vault), Phase L (devices), test retrofit, and exploratory ideas are tracked separately in `Docs/roadmap.md` and will be re-scoped after P1 lands.

---

# P0 — CLEANUP (delete out-of-MVP scope)

Goal: physically remove every artefact tied to in-app wishlist + external payment ingestion + YouPay. Debt_collector is a tracker; money moves outside; subs declare manually.

PG enum values that can't be dropped (`paymentsource.ingested`, `paymentcategory.wishlist`, `allocationtargettype.wishlist_goal`, `notificationtype.wishlist_fulfilled`) **stay as orphan values** — Postgres does not support `ALTER TYPE DROP VALUE`. Document in `CHANGELOG.md [Unreleased] / Removed`.

## P0.1 — Remove in-app wishlist (I1 + I2)

- **Delete files:**
  - `server/models/wishlist_item.py`
  - `server/daos/wishlist_dao.py`
  - `server/controllers/wishlist_controller.py`
  - `server/routers/wishlist.py`
  - `server/schemas/wishlist.py`
- **Edit:**
  - `server/main.py` — drop `wishlist` router include.
  - `server/models/__init__.py` — drop `WishlistItem`, `WishlistStatus`, `WishlistCreatedBy` exports.
  - `server/controllers/payment/controller.py` + `payment/helpers.py` — strip the wishlist auto-fulfil hook on validated allocations (keep the rest of the validate path intact).
  - `server/seeds/fake_data.py` — drop wishlist seed rows.
- **Migration `pXX_drop_wishlist`:** `DROP TABLE wishlist_item`. Do NOT touch the four enum values (orphaned by design).
- **Subagent:** `migration-writer` then `backend-feature` for code removal.
- **Acceptance:** server boots, `make check` green, `pytest` (whatever exists) green, `/openapi.json` no longer lists `/sub/wishlist*` or `/goddess/wishlist*`. `make sync-types` regenerates clean.

## P0.2 — Remove ingestion infrastructure (A1)

- **Delete files:**
  - `server/models/payment_webhook_event.py`
  - `server/daos/payment_webhook_dao.py`
  - `server/controllers/ingest_controller.py`
  - `server/services/ingest/` (whole package: `__init__.py`, `matcher.py`)
- **Edit:**
  - `server/models/__init__.py` — drop `PaymentWebhookEvent`, `WebhookProvider`, `WebhookResult` exports.
  - `server/models/payment.py` — `PaymentSource.ingested` enum value: keep in Python enum (PG orphan blocks removal) **or** mark with comment `# orphan: PG enum cannot drop value`. Decide in slice — preference: keep, comment.
- **Migration `pXX_drop_payment_webhook_event`:** `DROP TABLE payment_webhook_event`.
- **Subagent:** `migration-writer` then `backend-feature`.
- **Acceptance:** no `/webhooks/*` routes (none ever shipped, just confirm), no ingest references in `services/` tree.

## P0.3 — Remove Throne integration (A2)

- **Delete files:**
  - `server/models/throne_connection.py`
  - `server/daos/throne_dao.py`
  - `server/controllers/integrations_controller.py`
  - `server/routers/goddess_integrations.py`
  - `server/schemas/integrations.py`
- **Edit:**
  - `server/main.py` — drop `goddess_integrations` router include.
  - `server/models/__init__.py` — drop `ThroneConnection` export.
  - **KEEP** `services/crypto/envelope.py` + `services/crypto/root_kek.py` + `services/crypto/goddess_kek.py` + `goddess_kek` table — J4 medical depends on them. Only drop the Throne-specific consumer.
  - `server/.env.example` — drop `THRONE_*` keys; **keep** `ROOT_KEK_B64` (J4).
  - `server/.env` (local only, no commit) — same.
- **Migration `pXX_drop_throne_connection`:** `DROP TABLE throne_connection`. Do not drop `goddess_kek`.
- **Subagent:** `migration-writer` then `backend-feature`.
- **Acceptance:** `/goddess/integrations/throne` returns 404; envelope crypto still round-trips (smoke via REPL).

## P0.4 — Remove YouPay widget (A5)

- **Delete files:**
  - `client/src/components/payments/YouPayWidget.tsx`
  - `client/src/services/payments/youpay.ts`
- **Edit:**
  - `client/src/routes/sub/PaymentFormRoute.tsx` — strip widget mount + `youpay_ref` query-param prefill branch.
  - `client/src/utils/env.ts` — drop `VITE_YOUPAY_*` zod fields.
  - `client/.env.example` — drop `VITE_YOUPAY_*` keys.
  - `client/src/components/paymentMethods/PaymentMethodForm.tsx` + `methodMetadata.ts` — keep "YouPay" as a free-text method name (sub still records it manually); drop any "auto-widget" branch.
- **Subagent:** `frontend-feature`.
- **Acceptance:** `pnpm tsc` + `vite build` green, `make check` green, sub declare-payment page renders with no widget when method = "YouPay".

## P0.5 — Roadmap + CHANGELOG hygiene

- `Docs/roadmap.md` — flag A1, A2, A3, A4, A5, M1, M2, I1, I2, I3 with `🚫 DEFERRED — out of MVP scope (2026-04-16)` and a one-line link to the decision.
- `Docs/specs.md` — strike-through or delete §7.1 wishlist allocation target, §16.5 wishlist, §24.1–§24.4 ingestion, YouPay mentions. Replace with a one-paragraph rationale at the top of each section.
- `Docs/diagrams.html` — remove ingestion + wishlist Mermaid flows.
- `CHANGELOG.md [Unreleased] / Removed` — single bullet listing every dropped table + route, mention orphan PG enum values.
- `TODO.md` — strike P1.2, P1.4, P1.5; remove from "P1 — Product features" section.
- **Subagent:** docs sweep — main session, no subagent needed.

**Wave gate after P0:** Playwright smoke (login → goddess dashboard → sub declare manual payment) + `make check` + commit `chore(server): drop wishlist + ingestion + throne + youpay scope`.

---

# P1 — FINISH UNCOMPLETED FEATURES (UI + sub-medical)

Backend is mostly done after waves 1–7. The product is unusable for subs without these UI slices. Order = critical path.

## P1.1 — Photo infrastructure (B4 + A6 + B5)

Wave gate, blocks B6 + G3 + E3 evidence upload.

**Storage strategy:** S3-compatible from day 1, but **dev runs against a local MinIO container** (no AWS, no R2 credentials needed for `make dev`). Prod points the same env vars at AWS S3 / Cloudflare R2 / Backblaze B2 — adapter is provider-neutral.

- **Infra (B4-pre)** — add a `minio` service to `docker-compose.yml` alongside Postgres + Mailhog (image `minio/minio:latest`, console on `:9001`, S3 API on `:9000`, root creds in `infra/.env.minio`). Add a `minio-init` one-shot container that creates the buckets (`sub-photos`, `toy-photos`, `vault` reserved for K) on boot via `mc mb --ignore-existing`. New Make target `make seed-photos` walks `server/seeds/photos/` and uploads stub WEBPs into the right keys so `make init-dbs` produces a populated dev environment end-to-end.
  - Subagent: `backend-feature` (touches `docker-compose.yml`, `Makefile`, `infra/`).
- **B4** — `server/services/storage/object_store.py` async S3-compatible client (boto3 / aioboto3, signed URL TTL 10 min) reading `S3_ENDPOINT_URL`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_SUB_PHOTOS` from `core/config.py`. Provider switch is purely an env-var change (MinIO → S3/R2/B2). `server/models/sub_photo.py` + `server/controllers/photo_controller.py` + `POST /profile/photos` (5 MB cap, EXIF strip via Pillow, MIME guard, key `<goddess_id>/<sub_id>/<uuid>.ext`). Migration.
  - Subagent: `external-service-adapter` + `backend-feature`. Deps: infra slice above.
- **A6** — `client/src/assets/goddess/*.webp` + `<GoddessPhoto variant="hero|portrait|accent|card" />`. Replace direct imports on `LandingRoute`, `GoddessDashboard`, public `InvitationRoute`, `LoginRoute`. (Static client-side bundle, no S3 dependency — these are brand assets, not user uploads.)
  - Subagent: `frontend-feature`. Deps: —. **Parallel with infra + B4.**
- **B5** — `GET /goddess/photo-queue`, `POST /goddess/photos/{id}/approve|reject` + `PhotoQueueRoute.tsx` + `PhotoReviewCard.tsx`. Soft-delete on reject (status flag, file kept until 30-day GC); admin force-delete purges S3 key.
  - Subagent: `backend-feature` + `frontend-feature`. Deps: B4.

**Acceptance:** fresh clone → `make init-dbs` → MinIO container up → seeded dev photos visible on goddess dashboard. Prod env file points the same vars at AWS S3 endpoint and the same code path works.

## P1.2 — Sub-facing UI burst (six parallel slices)

All backend already shipped (waves 3–6). Dispatch six `frontend-feature` subagents in one message.

- **C4** — `/profile/kinks` matrix (`KinksRoute`, `KinkMatrix`, `KinkRow`, `RatingPicker`). Virtualised, safety-flag confirmation modal on `curious+` for `pain_endurance`. Each ≤300 lines. Deps: C2 ✅.
- **D4** — `/profile/limits` editor + `<SafewordBanner>` pinned in app header (sub + goddess). Hard-limit-not-acknowledged badge on goddess sub list. Deps: D2, D3 ✅.
- **E4** — `/today` sub landing: today's `ritual_occurrence` cards + open `Task` cards + journal CTA. Inline `complete`/`submit` with optional `note` + `evidence_r2_key`. Deps: E3 ✅, B4 (P1.1).
- **F5** — `/journal` sub append-only history + `/goddess/journal` reader + goddess `MeritsAdminRoute` (reward + punishment tier CRUD UI on top of F4). Deps: F2, F4 ✅.
- **G3** — `/sub/profile/inventory` (read-only) + `/goddess/subs/{id}/inventory` (CRUD). Grouped by `ToyCategory`, photos lazy-loaded. Deps: G2 ✅, B4 (P1.1).
- **F4 admin UI gap** — verify reward redemption + punishment invocation UI on goddess side; backend ledger is in. Deps: F4 ✅.

Visual baseline via `visual-regression` skill after the wave.

## P1.3 — Goddess-facing UI consolidation

- **B6** — `SubProfileCard` on `/goddess/subs/:id`: avatar + top approved photo + identity + `ownership_status` chip + `real_name` (goddess-only mask). Deps: B2, B5.
- **C5** — `GET /goddess/kinks/overview` (per-item aggregated counts by rating) + `KinkOverviewRoute` + `KinkHeatmap`. <300 ms render on 20 subs × 80 items. Deps: C2 ✅.
- **E5** — `/goddess/review-queue` cross-sub queue of pending occurrences + submitted tasks. Bulk approve/reject in single API call. Deps: E3 ✅ + small bulk-action endpoint.
- **I4 gauge UI** — render `TributeGauge` component on goddess sub-detail page (backend ✅, UI may already partially exist — verify in `client/src/components/goddess/`).
- **I5 penalty rules UI** — `/goddess/penalty-rules` CRUD page on top of existing API.

## P1.4 — Identity completion + soft UX

- **B2** — Signup form fields (age ≥18 gate, gender, pronouns, location, timezone auto-detect) + `GET/PATCH /profile`. Post-first-set `real_name` edits route through existing `ProfileChangeRequest` (P1.6 ✅). Deps: B1 ✅.
- **F6** — `sub_aftercare` table + `GET/PUT /profile/aftercare` + `AftercarePanel` shown after manual goddess "Session complete" toggle (30-min cookie). Deps: B1 ✅.

## P1.5 — Medical activation (J4 — closes Phase J)

- **J4** — `GET/PUT /profile/medical` gated by `require_consent('medical')` (J3 ✅). Encrypt every field via `encrypt_for_goddess` (J2 ✅) into the `*_enc bytea` columns from D6 (✅). Goddess "Reveal" is explicit + logged in `admin_action`. Sub editor + goddess `MedicalRevealPanel`, render consent body on 428.
  - Subagent: `backend-feature` + `frontend-feature`. Deps: J2/J3/D6 ✅.
- **Acceptance:** consent 428 round-trip → accept → write → reveal → admin_action row present.

---

## Cross-cutting maintenance (every wave)

1. `Docs/diagrams.html` refreshed when a flow changes (panic, ritual cron, contract renewal, vault revoke).
2. `make sync-types` after every backend slice; CI `api-types-drift` is the brake.
3. `CHANGELOG.md [Unreleased]` updated before commit.
4. UUIDs never leak to sub/goddess UI (admin only).
5. Payment declarations always render `source` `Badge` (`sub_declared` | `goddess_recorded`); the orphan `ingested` value should never appear in new rows.

## Dispatch order (TL;DR)

```
P0.1  P0.2  P0.3  (parallel: 3 backend agents)  →  P0.4 (frontend)  →  P0.5 (docs)
                                                                              ↓
P1.1 (infra + B4 + A6 parallel, then B5)                                      ↓
                                                                              ↓
P1.2 (six parallel frontend slices)                                           ↓
                                                                              ↓
P1.3 (parallel where possible)  →  P1.4 (parallel)  →  P1.5 (J4 medical)
```

**Critical path to MVP-usable-by-sub:** P0 → P1.1 → P1.2. Phases K/L + test retrofit + new-feature ideas live in `Docs/roadmap.md` and get re-planned after P1.5 closes.
