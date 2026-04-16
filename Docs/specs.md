# Debt Collector — Design Document

**Date:** 2026-04-16
**Status:** Draft v2 — scope expanded to cover full sub-profile / lifestyle domain
**Companion docs:** `use_cases.md` (user journeys), `roadmap.md` (executable task list), `diagrams.html` (Mermaid flows)

---

## 0. How to read this document

The app started as a pure findom tracker (auth + rolling + debt + payments). Goddess has since expanded the scope to a full **D/s management platform** — sub profile, kinks, limits, rituals, journals, toys, and two sensitive modules (blackmail vault, TechDom remote control).

Spec is split in parts:

| Part | Sections | Scope |
|------|----------|-------|
| **I — Core Financial** | §1–§15 | Already built (phases 1–10) + small residual gaps |
| **II — Sub Profile** | §16–§18 | Identity extension, kinks, limits & safety |
| **III — D/s Management** | §19–§21 | Rituals, tasks, journal, punishment/reward, toys |
| **IV — Sensitive Vaults** | §22–§23 | Blackmail vault, TechDom / secrets vault — *legally gated* |
| **V — Integrations** | §24 | Payment ingestion (Throne, PayPal, Revolut, CashApp, YouPay) |
| **VI — Security & Privacy additions** | §25 | Encryption envelope, consent framework, retention |

`roadmap.md` breaks every gap in this doc into 61 concrete tasks with dependencies.

---

# PART I — Core Financial (shipped, minor gaps)

## 1. Vision & Scope

A private, invite-only web app that lets Goddess Mean Mal enslave subs through two independent financial-domination instruments:

1. **Rolling tribute** — a weekly recurring obligation with escalating late multipliers.
2. **Debt contract** — a signed, interest-bearing debt with configurable penalties, mid-contract adjustments, and a buyout clause.

The app is a **tracker and registry**, not a payment gateway. Money moves externally (Throne, PayPal, bank, Apple Pay, etc.). The app is the source of truth for obligations, balances, penalties, and history.

### Success criteria (v1)

- Goddess can onboard a sub via invite link, collect entry tribute, attribute a rolling, sign a debt contract, and watch the debt evolve under interest + penalties + adjustments.
- Sub has a single dashboard showing what he owes now, what's due next, and his full payment history.
- Admin has a global override console to fix any state without writing SQL.
- Hosting cost is bounded to a single small VPS or free-tier combo (decision deferred).

### Out of scope (v1)

- Multi-Goddess (single-tenant usage, multi-tenant-ready schema, opening up deferred ~1 year)
- Payment processing / card handling
- Mobile apps (web responsive only)
- Public marketing / SEO / indexability (invite-only)
- Chat / DMs (use external platforms)

---

## 2. Roles

| Role | Scope |
|------|-------|
| `admin` | You (developer). Full CRUD on every entity via custom admin UI. Separate login. No MFA in v1. |
| `goddess` | Mean Mal. Full control over her subs, contracts, rollings, payments, blacklist, profiles, vaults. |
| `sub` | A slave, attached to a Goddess via `goddess_id` FK. Can only see and act on his own data. Joins via invite link only. |

`goddess_id` is present on every sub-owned table from day one to make the future multi-Goddess expansion a non-breaking change.

**UUID policy.** UUIDs are never shown to `sub` or `goddess` users. Only `admin` may see raw UUIDs in tables/detail pages. Display `display_name` + `username` instead.

---

## 3. Currency, Language, Timezone

- Currency: **GBP (£)** everywhere, no conversion.
- Language: **English only** (UI, PDF contracts, emails, kink taxonomy labels).
- Timezone: **Europe/London** hardcoded for all deadline computations and the daily cronjob. DST handled by `zoneinfo`. Client-side, deadlines are displayed in the viewer's local timezone with a "UK = your time" label.

---

## 4. Authentication & Onboarding

### 4.1. Invitation flow

1. Goddess creates an invitation (UUID token, entry tribute amount, optional note, expiry — default 7 days).
2. She copies the URL (`/invite/<token>`) and sends it externally.
3. Sub opens the page, fills the signup form: `username`, `first_name`, `last_name`, `email`, `password`, optional `twitter_handle`, optional `source_note`.
4. Backend creates a `sub` user linked to the Goddess, in state `PENDING_ENTRY_TRIBUTE`, and invalidates the invitation token.
5. Sub declares the entry tribute payment. Goddess validates → state → `ACTIVE`.

Signup form is extended in §16 with identity fields (age, gender, pronouns, timezone).

### 4.2. Session auth

- Password hashing: **Argon2id** via `argon2-cffi`, with a server-side **pepper** (HMAC-SHA256 pre-hash, base64) so DB dumps alone are not crackable.
- Sessions: **JWT** access token (15 min) + refresh token (30 days, `HttpOnly debt_refresh` cookie, `Secure + SameSite=strict` in prod).
- Endpoints enforce role + ownership (`sub` can only touch his own rows, `goddess` only her own subs).
- Password reset: email via **Resend**. Reset token = signed JWT, TTL 1h, one-time use.
- Rate limits via `slowapi` on login, signup, reset, invite-fetch.

### 4.3. Account states

Two orthogonal states live on the user row:

1. **Access state** (controls login):

   ```
   PENDING_ENTRY_TRIBUTE → ACTIVE → BLACKLISTED → ACTIVE (on forgive)
   ```

2. **Ownership status** (D/s narrative, §16.3):

   ```
   free | owned | in_training | collared | blackmailed | released
   ```

`BLACKLISTED` users cannot log in. Ownership status is purely display / filtering and set by the Goddess.

### 4.4. Admin impersonation

Admins can issue a scoped access token that acts as another user without knowing their password. The JWT carries an `imp` claim = admin's own UUID; `sub` is the impersonated user. Client shows a persistent banner ("Impersonating <display_name> — return to admin"). All mutations during impersonation are logged in the `admin_action` audit table with the acting admin's id. Impersonation tokens inherit the normal 15-minute access TTL (no refresh).

---

## 5. Rolling Tribute

One rolling per sub. Goddess creates/updates unilaterally (no sub acceptance). Fields: `amount` (GBP, `0` = disabled/hidden), `deadline_day` (Mon–Sun, default Fri), `deadline_time` (default 12:00), `late_multiplier_per_day` (default 1), `paused` (bool), `notes` (free text).

A **rolling week** runs from one deadline to the next. A single validated `rolling` payment of at least the due amount resets the cycle. Amount due within a cycle:

```
due = amount * (1 + max(0, days_since_deadline) * late_multiplier_per_day)
```

Saturday = 1 day late. Sunday = 2. No fractional-day grace. If sub pays less than `due` at deadline, the cycle is considered missed → notifications pushed both sides, multiplier continues to grow until full payment.

**First cycle anchor**: starts at attribution → next occurrence of `deadline_day` at `deadline_time`. Attribution made after this week's deadline → cycle starts next week (no immediate past-due).

---

## 6. Debt Contract

### 6.1. Fields

| Field | Type | Notes |
|-------|------|-------|
| `principal` | decimal | Starting balance |
| `interest_rate` | decimal | Fraction (0.20 = 20%) |
| `interest_period` | enum `monthly` \| `yearly` | Yearly → monthly-equivalent via `r_month = (1 + r_year)^(1/12) − 1` |
| `duration_periods` | int | Number of payment periods |
| `payment_frequency` | enum `weekly` \| `biweekly` \| `monthly` | |
| `minimum_payment` | decimal | Per-period minimum to avoid penalty |
| `late_penalty_severity` | enum `light` \| `medium` \| `severe` | UI preset; drives default `late_penalty_percent` |
| `late_penalty_percent` | decimal | Applied once per missed period: `balance *= (1 + late_penalty_percent)` |
| `dom_can_add_surprise_penalty` | bool | Unlocks "Add penalty" button |
| `mid_contract_addition_mode` | enum `disabled` \| `dom_controlled` \| `sub_approval_required` | |
| `exit_amount` | decimal | Buyout AND breach formula |
| `status` | enum (§6.2) | |
| `signature_b64` | text? | Sub-drawn signature (data URI), renders into PDF on demand |
| `signed_at` | datetime? | Europe/London |
| **`clauses_json`** | jsonb | **NEW** — Special clauses (§6.8) |
| **`review_at`** | datetime? | **NEW** — Next renewal/review date |
| **`renewal_policy`** | enum `none` \| `reminder` \| `auto_extend` | **NEW** |

### 6.2. State machine

```
                  (Goddess initiates)                    (Sub initiates)
                          │                                      │
                          ▼                                      ▼
                  PENDING_SUB                          PENDING_DOM
                ┌──────┬──────┐                      ┌────────┬──────────┐
         signs  │      │ counters                    │ accepts│ counters │
                ▼      ▼                              ▼        ▼
            ACTIVE   PENDING_DOM_COUNTER         PENDING_SUB_SIGNATURE
                         │                              │
                  accept │   reject                     ▼
                         ▼     ▼                     (sub signs → ACTIVE,
                   PENDING_SUB_SIGNATURE             or leaves pending)
                               │
                               ▼
                         ACTIVE / CANCELLED_BY_DOM

From ACTIVE:
  → CLOSED (buyout validated)
  → BREACHED (Goddess marks as breached)
  → COMPLETED (full repayment)
```

One counter-proposal round per side. After that, sub can only sign the final version or leave it in `PENDING_SUB_SIGNATURE`. Goddess has the last word. Goddess can close a `PENDING_*` contract at any time → `CANCELLED_BY_DOM`.

### 6.3. Signature & PDF

- Sub draws signature on HTML canvas → base64 PNG (data URI) → stored in `signature_b64`.
- `GET /debts/{id}/pdf[?draft=1]` regenerates the PDF inline via **WeasyPrint** (no blob storage). Template: A4, 8 named sections, full repayment schedule, framed signature block (Europe/London `signed_at`), DRAFT watermark variant.
- Download gate: `signed_at IS NOT NULL`.
- No IP / user-agent logging (GDPR-minimal).

### 6.4. Ledger (`debt_event`)

Every balance-modifying event is a row. `balance` + `total_paid` are derived at read time via `SUM()` over the ledger (single source of truth, no cached columns).

| Event type | Created by | Effect |
|------------|-----------|--------|
| `period_interest` | cronjob | `balance *= (1 + r_month * period_factor)` at start of each period |
| `payment_applied` | validation of `weekly_debt` / `debt_payment` | `balance -= amount`; `weekly_debt` also satisfies the period |
| `late_penalty` | cronjob when period ends without min payment | `balance *= (1 + late_penalty_percent)` |
| `surprise_penalty` | Goddess action | `balance += amount`, reason logged |
| `adjustment` | Goddess action (or sub-approved) | `balance += amount`, reason logged |
| `buyout_paid` | buyout validation | `total_paid += amount`, status → CLOSED |

Idempotency on cron: `(contract_id, period_index, event_type)` uniqueness key.

### 6.5. Simulation

Contract-creation form shows a live projection (period-by-period balance evolution) assuming minimum payment each period, no late, no penalties, no adjustments. Warning banner for `severe` presets when `balance × (1 + r_month) − min_payment > balance` ("debt will grow faster than minimum payment can repay it").

**What-if simulator** (goddess-only, `/goddess/contracts/:id/preview`): applies hypothetical events at the current payment period, preserves paid rows, red-highlights changed rows in a before/after modal.

### 6.6. Buyout

```
exit_due(t) = exit_amount * (t / duration_periods)
```

Sub clicks Buy out → sees computed amount + payment methods → pays externally → declares `buyout` category → Goddess validates → status → `CLOSED`, `total_paid += exit_due`. Reject → status → `ACTIVE`, sub notified.

### 6.7. Breach

Goddess clicks **Mark as breached** on any `ACTIVE` contract:

1. That contract → `BREACHED` (terminal).
2. **All other active contracts of that sub** → `BREACHED` (cascade).
3. Sub's account → `BLACKLISTED`.
4. Blacklist entry created with first/last name, username, X handle, breach date, reference contract, balance at breach.

Forgiveness: Goddess clicks Forgive → account → `ACTIVE`, form asks "reinstatement fee paid" (GBP, logged). Previously breached contracts stay `BREACHED`.

### 6.8. Special clauses (NEW)

`clauses_json` stores typed clauses. Each entry:

```jsonc
{
  "type": "ownership" | "exclusivity" | "blackmail_consent" | "collaring" | "custom",
  "label": "Exclusive ownership for 6 months",
  "body": "Free-text body rendered in the PDF",
  "requires_signature": true,
  "linked_vault_id": "uuid?"  // only for blackmail_consent
}
```

Clauses appear as a dedicated PDF section and as read-only cards on `/contracts/:id`. Adding a clause after signature → triggers re-signature flow (new `signature_b64`, new `signed_at`, version bump).

### 6.9. Renewal / review (NEW)

- `review_at` surfaces on Goddess dashboard 14 days before date.
- Daily cronjob pushes WS + in-app notification when `review_at <= now() + 14d` (once, idempotent via `notification` uniqueness on `(contract_id, 'review_reminder')`).
- `renewal_policy = auto_extend` → on `review_at` crossing, cron creates a new contract in `PENDING_SUB` with identical fields and `review_at += duration`.

---

## 7. Payment Declarations

### 7.1. Data model

**`payment_declaration`** — what the sub says he paid (or what the Goddess recorded directly):

- `sub_id`, `goddess_id`, `amount`, `method_id`, `external_timestamp`, `note`, `category`, `status` (`pending` / `validated` / `rejected` / `cancelled`), `source` (`sub_declared` / `goddess_recorded` / `ingested`), `created_by`, `declared_at`, `validated_at`, `validated_by`, `rejection_reason`.
- `source` renders as a **Badge** in sub history and goddess validation queue. New `ingested` value covers webhook auto-imports (§24).

**`payment_allocation`** — validated ledger entry, one per declaration (no split):

- `declaration_id`, `target_type`, `target_id`, `amount`.

Mapping `PaymentCategory` → `AllocationTargetType`:

| PaymentCategory  | AllocationTargetType |
| ---------------- | -------------------- |
| `entry`          | `entry`              |
| `tribute`        | `tribute`            |
| `rolling`        | `rolling_cycle`      |
| `weekly_debt`    | `contract_debt`      |
| `debt_payment`   | `contract_debt`      |
| `buyout`         | `contract_buyout`    |
| **`wishlist`**   | **`wishlist_goal`**  |
| **`profile_change_fee`** | **`profile_change_fee`** |

`weekly_debt` and `debt_payment` collapse to `contract_debt` — same ledger, different declaration label for reporting. `wishlist` funds a specific `wishlist_item` (see §16.5).

Goddess can re-categorize before validation (updates `category`). No split.

### 7.2. Goddess direct entry

Goddess can skip the declaration step and create a `validated` declaration + allocation in one go ("Record payment" on the sub page). Sub sees it with a "recorded by Goddess" tag.

### 7.3. Derived counters (read-time `SUM()`, never cached)

- `sub.total_drained = Σ validated allocations for this sub`
- `goddess.total_drained_global = Σ across all subs`
- `debt_contract.total_paid = Σ of target_type ∈ (contract_debt, contract_buyout)`
- `rolling.last_paid_at = max(created_at) of validated rolling_cycle allocations`

### 7.4. Read-model endpoints

Dashboards need pre-aggregated views. Pure read, no write verbs:

- `GET /goddess/payments/weekly` — tribute volume per ISO week.
- `GET /goddess/subs/late` — active subs with overdue rolling or weekly debt instalments.
- `GET /sub/planning` — 30-day forward calendar of expected rolling + contract payments.
- `GET /goddess/dashboard/charts` — monthly revenue, method breakdown, subs-by-status, top-5 subs, 30-day late-rate, contract-state counts.

Aggregation lives in controllers; routers only shape HTTP. Responses are plain DTOs, not DB rows.

---

## 8. Cronjob (daily, 08:00 Europe/London)

Embedded **APScheduler** inside the FastAPI process. Per active sub:

### 8.1. Rolling

- `rolling.amount > 0` + deadline in next 24h + no validated rolling payment for current cycle → notif sub (reminder).
- Deadline passed without validated rolling payment → recompute due, notif sub + Goddess, update late page.

### 8.2. Debt contracts

- Period ends in next 24h without validated `weekly_debt` → notif sub.
- Period just ended without validated `weekly_debt` → `late_penalty` + start new period (`period_interest`) + notif both.
- Period just ended WITH validated `weekly_debt` → start new period (`period_interest` only).

### 8.3. Review reminders (NEW)

- Contract `review_at <= now() + 14d` and no `review_reminder` notification yet → push one to Goddess.
- `renewal_policy = auto_extend` + `review_at` crossed → clone contract → `PENDING_SUB`.

### 8.4. Rituals & tasks (NEW)

Daily ritual protocols (§19) generate a `ritual_occurrence` row per sub per day at cron time. Overdue tasks push notifications.

### 8.5. Idempotency

Every cron event carries a uniqueness key appropriate to its type (`(contract_id, period_index, event_type)`, `(sub_id, date, ritual_id)`, `(contract_id, 'review_reminder')`). Re-running the same day is a no-op.

---

## 9. Notifications

### 9.1. In-app (primary)

Table `notification(id, user_id, type, payload_json, created_at, read_at)`. Bell icon + unread badge + drawer with deep-links.

### 9.2. Real-time WebSocket

`GET /ws/notifications` (JWT via `?token=` or cookie). `NotificationPublisher` abstraction: in-process broadcast v1, swappable for Redis pub/sub later. Client reconnects with backoff; falls back to polling on WS failure.

### 9.3. Email

**Resend** (100 emails/day free tier). Only for password reset (JWT link, TTL 1h). Invitations are not emailed by the app — Goddess sends the URL externally.

---

## 10. Data Model (overview)

Core financial tables (shipped) — unchanged from v1 of this doc:

```
goddess, user, invitation, payment_method,
rolling_tribute, debt_contract, debt_event, debt_adjustment,
payment_declaration, payment_allocation,
notification, blacklist_entry, admin_action,
profile_change_request   -- P1.6 shipped
```

New tables (Parts II–V) listed in their respective sections. All sub-owned tables carry `goddess_id` for future multi-tenant isolation.

---

## 11. Architecture

### 11.1. Backend

- **FastAPI** (Python 3.12), ASGI via Uvicorn.
- **SQLModel** (SQLAlchemy 2.0) + Pydantic.
- **Alembic** migrations.
- **PostgreSQL 16** via **asyncpg** (async everywhere).
- **APScheduler** in-process.
- **WeasyPrint** for PDF (on-demand, no blob storage).
- **Resend** for email. **argon2-cffi** + pepper for passwords. **PyJWT** for tokens.
- Layered: `routers/` → `controllers/` → `daos/` → `models/`, with `services/` for external adapters (Resend, future: Throne, PayPal, Lovense, KMS).
- **Rate limiting**: `RateLimiter` Protocol + `MemoryRateLimiter` / `RedisRateLimiter` impls, toggled by `RATE_LIMITER_BACKEND` + `REDIS_URL`.

### 11.2. Frontend

- **React 19** + TypeScript + **Tailwind CSS** (tokens from `tokens.css`).
- **Vite** dev + static build.
- **TanStack Query** server state, typed key factory in `client/src/lib/queryKeys.ts`.
- **openapi-fetch** typed client, types in `client/src/types/api.generated.ts`, regenerated via `make sync-types`. CI job `api-types-drift` fails on drift.
- **React Router**. **Zod** client validation. `client/src/utils/env.ts` only file reading `import.meta.env`.
- Folder: `components/` → `hooks/` + `services/` → `api/` (one-way imports).
- 300-line limit per component. Named exports only. No inline `style`.

### 11.3. Admin UI (in-app, `/admin`)

Role-guarded. Reusable `<AdminTable>` / `<AdminForm>` parameterized by entity schema generated from OpenAPI. One page per entity. Every field editable, every row deletable, pagination + filters + search. Backend `/admin/<entity>` routes with unrestricted CRUD for role `admin`, deny-list blocks `id`, `password_hash`, `role`, `goddess_id`, `created_at` from PATCH/POST.

### 11.4. Hosting (deferred)

Candidates:

- Hetzner CX22 VPS (~£46/yr, full-stack Docker Compose, no cold starts, recommended) — or
- Free-tier combo (Cloudflare Pages + Fly.io + Neon, ~£8/yr, cold-start caveats)

All code Docker-based → portable between options.

---

## 12. Security & Privacy (baseline — see §25 for additions)

- Argon2id + pepper (HMAC-SHA256 pre-hash, base64).
- JWTs HS256, rotating signing keys planned.
- CORS locked to prod domain. `SecurityHeadersMiddleware` (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS in prod).
- `APP_ENV` (`dev|test|staging|prod`); prod auto-enables `Secure` cookies, `SameSite=strict`, HSTS.
- No IP, no user-agent stored (GDPR-minimal).
- Blacklist retention indefinite; forgive only unlocks the account.
- Password reset tokens one-time use.
- `admin_action` audit log on every admin mutation and impersonation action.

---

## 13. Financial Math (reference)

```
r_month        = (1 + r_year) ^ (1/12) − 1
period_factor  = { weekly: 12/52, biweekly: 12/26, monthly: 1 }
interest_cap   : balance *= (1 + r_month * period_factor)
late_penalty   : balance *= (1 + late_penalty_percent)
buyout         : exit_due(t) = exit_amount * (t / duration_periods)
rolling_due    : due = amount * (1 + max(0, days_late) * late_multiplier_per_day)
```

---

## 14. Open Questions / Deferred Decisions

- Hosting — end of dev.
- Multi-tenant UI — schema ready (FK isolation), UX spec deferred.
- Token expiry on invitations — default 7d, reconfigurable per invite.
- **Vaults (§22–§23)** — require explicit legal review (UK/EU consent framework) before implementation. Gated.

---

## 15. Build Sequence (pointer)

`roadmap.md` is the executable plan. High-level phase order:

A. Residual core gaps (ingestion, YouPay, photos) — finishes Part I.
B. §16 Identity extension.
C. §17 Kinks.
D. §18 Limits & safety.
E. §19 Rituals & tasks.
F. §20 Journal, punishment/reward, aftercare.
G. §21 Toys inventory.
H. §6.8–§6.9 Contract clauses & renewal.
I. §16.5 Wishlist + tribute minimum schedule.
J. §25 Crypto envelope + consent framework (prerequisite for K and L).
K. §22 Blackmail vault (gated).
L. §23 TechDom / device control (gated).
M. §24 Payment ingestion integrations.

---

# PART II — Sub Profile

## 16. Identity extension

Extends the base `user` row with D/s profile fields. Goal: goddess sees a rich profile card per sub; sub sees a single "My profile" page.

### 16.1. Fields (new columns on `user` or side table `sub_profile`)

Side table `sub_profile(user_id PK, …)` to keep `user` small and easy to query for auth:

| Field | Type | Visibility | Notes |
|-------|------|-----------|-------|
| `real_name` | text? | goddess + admin only | Optional; masked on sub self-view once set |
| `age` | int | goddess + sub | ≥ 18 validated on write |
| `gender` | enum `male \| female \| non_binary \| other` | goddess + sub | |
| `pronouns` | text | goddess + sub | Free-form, 32 chars max |
| `location` | text | goddess + sub | City / country free text |
| `timezone` | text | goddess + sub | IANA zone, defaulted from browser |
| `joined_empire_at` | datetime | goddess + sub | Set at user creation; editable only by goddess/admin |
| `ownership_status` | enum (§4.3) | goddess + sub | Goddess-only write |

`display_name` (already on `user`) remains the primary name shown everywhere except admin tables.

### 16.2. Profile photos

- Storage: **Cloudflare R2** bucket `sub-photos` (same account as optional future assets). Key = `<goddess_id>/<sub_id>/<uuid>.jpg`. Server-side strip EXIF on upload. Max 5 MB, JPEG/PNG/WebP.
- Table `sub_photo(id, sub_id, goddess_id, r2_key, status, uploaded_at, reviewed_at, reviewed_by, rejection_reason)` with `status` = `pending | approved | rejected`.
- Sub uploads → status `pending`, not visible on goddess profile card until approved.
- Goddess review page `/goddess/photo-queue` with approve/reject actions.
- Admin can force-delete. Deletion = row soft-deleted + R2 key cleared (hard delete deferred to daily GC job).

### 16.3. Ownership status transitions

State set:

```
free → owned → in_training → collared
owned | in_training | collared → blackmailed  (requires active blackmail vault consent, §22)
any → released  (terminal unless goddess reactivates)
```

Only `goddess` or `admin` can change. Change creates a `status_event(sub_id, from, to, reason, changed_by, at)` row for history.

### 16.4. API surface

- `GET /profile` (self, sub-side) — returns own `sub_profile` + photos (approved only for sub; pending visible to self).
- `PATCH /profile` — sub edits allowed fields (everything except `real_name`, `joined_empire_at`, `ownership_status`). Protected fields (`real_name` after first set) go through `ProfileChangeRequest` (existing P1.6 workflow).
- `GET /goddess/subs/{id}/profile` — goddess full view.
- `POST /profile/photos` — sub uploads (multipart).
- `POST /goddess/photos/{id}/approve|reject` — goddess review.
- `PATCH /goddess/subs/{id}/status` — ownership status change.

### 16.5. Wishlist + tribute minimum schedule

> **🚫 SCOPE CUT 2026-04-16 (wishlist only):** in-app wishlist (`wishlist_item`, `PaymentCategory.wishlist`, `AllocationTargetType.wishlist_goal`) is OUT OF MVP — wishlist management belongs to external apps. **Tribute minimum schedule** (`tribute_minimum` + dashboard gauge) stays. Migration `328e11d71888` dropped the table; PG enum values remain as orphans.

**Wishlist (`wishlist_item`)**:

| Field | Notes |
|-------|-------|
| `goddess_id`, `sub_id` | Shared scope: goddess-defined OR sub-proposed |
| `title`, `description`, `image_url`, `external_url` | Amazon/Throne/etc. link |
| `target_amount` | GBP |
| `collected_amount` | Derived via `SUM(allocation.amount WHERE target_type='wishlist_goal')` |
| `status` | `open | fulfilled | cancelled` |
| `created_by` | `goddess | sub` — sub-created items need goddess approval before becoming `open` |

New `PaymentCategory = wishlist` targets a specific `wishlist_item.id`. When `collected_amount >= target_amount`, status auto-flips to `fulfilled` and both parties are notified.

**Tribute minimum schedule (`tribute_minimum`)**:

Separate from rolling — represents a non-due-dated *target* (e.g. "£200/month expected"). One row per sub:

| Field | Notes |
|-------|-------|
| `period` | enum `weekly | monthly` |
| `amount` | GBP |
| `grace_below_percent` | decimal, default 0.80 — below this → "under-performing" flag |
| `notes` | free text |

Derived `actual_this_period = Σ validated allocations (any category except wishlist) this period` surfaces as a gauge on the goddess dashboard. No penalty logic — this is display-only (the rolling + contracts already enforce money).

**Penalty escalation rules (`penalty_rule`)** — per-sub, optional overrides of default rolling / contract penalties:

| Field | Notes |
|-------|-------|
| `trigger` | enum `rolling_missed | debt_period_missed | ritual_skipped | task_overdue` |
| `action` | enum `add_amount | multiply_balance | add_task | notify_only` |
| `value` | decimal or task template id |
| `cooldown_hours` | int, default 24 (prevent double-firing) |

Cron (§8) consults `penalty_rule` before applying defaults.

---

## 17. Kinks, Fetishes & Interests

### 17.1. Taxonomy (seeded)

Eight categories with curated default items. Admin can edit seeds; items are soft-deleted (never hard-deleted) to preserve rating history.

```
bondage_restraints      rope, cuffs, mummification, suspension, …
impact_play             spanking, caning, flogging, whipping, …
sensory_sensation       wax, ice, electro, temperature, blindfolds, gags
humiliation_degradation verbal, public, forced_feminization, exposure
service_worship         foot, body, domestic, financial
pain_endurance          nipple_torture, CBT, breath_play  ← flagged "safety-critical"
psychological           mindfuck, fear, blackmail_fantasy, denial
roleplay_dynamics       pet, slave, sissy, cuck, object
```

### 17.2. Data model

```
kink_category(id, slug, label, safety_flag bool, sort_order)

kink_item(id, category_id, slug, label, description, safety_flag bool,
          is_custom bool, proposed_by user_id?, approved bool, created_at)

sub_kink_rating(id, sub_id, goddess_id, item_id,
                rating enum, note, updated_at)
```

`rating` enum: `hard_limit | soft_limit | curious | loves | fetish_need | not_set`.

### 17.3. Custom kink proposal flow

Sub adds a custom item → `kink_item(is_custom=true, approved=false, proposed_by=sub.id)`. Goddess review queue `/goddess/kinks/proposals` shows pending proposals with approve/reject. Approved item becomes available to every sub of that goddess.

### 17.4. UI

- Sub: `/profile/kinks` — matrix (category × item) with rating selector. Items flagged `safety_flag` show a warning icon + require confirmation when rated `curious`/`loves`/`fetish_need`.
- Goddess: `/goddess/subs/{id}/kinks` — same matrix read-only + "compatibility score" with another sub (optional, phase F).
- Aggregation: `/goddess/kinks/overview` — heatmap of top-rated items across her subs.

---

## 18. Limits, Triggers, Medical & Safewords

Critical for safety. Visibility rules are strict.

### 18.1. Hard & soft limits

Already partially covered in §17 via `rating = hard_limit | soft_limit`. For prose limits that don't fit the kink taxonomy, additional table:

```
sub_limit(id, sub_id, goddess_id, kind enum 'hard'|'soft',
          body text, added_at, acknowledged_by_goddess_at)
```

Goddess dashboard flag: any sub with an unacknowledged `hard` limit shows a red badge until she opens the limit card (sets `acknowledged_by_goddess_at`).

### 18.2. Triggers

```
sub_trigger(id, sub_id, kind enum 'emotional'|'physical'|'psychological',
            body text, severity enum 'low'|'medium'|'high',
            created_at)
```

Displayed on goddess sub page as a pinned banner when `severity = high`.

### 18.3. Medical information (encrypted)

Sensitive data. GDPR art. 9 "special category". Encrypted at rest with envelope encryption (§25):

```
sub_medical(id, sub_id, goddess_id,
            conditions_enc bytea,   -- JSON encrypted
            medications_enc bytea,
            allergies_enc bytea,
            doctor_contact_enc bytea,
            updated_at)
```

Only `sub` (self) and `goddess` can decrypt. Admin role can **delete** (GDPR erasure) but not **read** — no admin back-door on medical. Decryption key wrapped by goddess-specific KEK (§25.2).

Safety-critical kinks (`pain_endurance.breath_play`, CBT, etc.) surface a prompt on the goddess sub page: "Review medical info before session" → 1-click inline decrypt.

### 18.4. Safewords & emergency stop

```
sub_safeword(sub_id PK, word text, signal text, emergency_contact_name text,
             emergency_contact_phone text, updated_at)
```

Displayed prominently on every `/goddess/subs/{id}/*` page header. Sub can update without approval.

**Emergency stop protocol (phase J)**: `POST /sub/panic` → immediately pauses all rituals, sets ownership_status = `released` (soft), notifies goddess with high-priority flag, logs event. No approval required from goddess side. Reversible only by the sub re-authenticating and confirming.

---

# PART III — D/s Management

## 19. Rituals & Tasks

### 19.1. Rituals (recurring protocols)

A ritual is a repeating obligation the sub must acknowledge daily/weekly. Examples: "morning devotion photo", "evening journal", "Sunday report".

```
ritual(id, goddess_id, sub_id, title, description,
       frequency enum 'daily'|'weekly'|'custom_days' (bitmask 0..6),
       time_of_day time?, requires_evidence bool,
       active bool, created_at)

ritual_occurrence(id, ritual_id, date (Europe/London), status enum
                  'pending'|'completed'|'skipped'|'missed',
                  evidence_text text?, evidence_photo_key text?,
                  completed_at, reviewed_by_goddess_at)
```

Cron (§8.4) creates `ritual_occurrence(status='pending')` rows at 00:00 Europe/London for all active rituals for the day. End-of-day cron flips `pending` → `missed` if not completed. Missing a ritual can trigger a `penalty_rule` (§16.5).

### 19.2. Tasks (one-off assignments)

```
task(id, goddess_id, sub_id, title, description, due_at,
     requires_evidence bool, status enum 'open'|'submitted'|'approved'|'rejected'|'overdue',
     evidence_text, evidence_photo_key,
     created_at, submitted_at, reviewed_at, reviewed_by)
```

Sub submits → status `submitted` → goddess reviews → `approved` or `rejected` (with reason). Overdue tasks (cron) can trigger `penalty_rule`.

### 19.3. UI

- Sub: `/today` — today's rituals + open tasks, submit evidence inline.
- Goddess: `/goddess/review-queue` — pending ritual occurrences + submitted tasks, approve/reject bulk.

---

## 20. Journal, Punishment/Reward, Aftercare

### 20.1. Journal

```
journal_entry(id, sub_id, goddess_id, body, mood enum, photo_key?,
              created_at, read_by_goddess_at, goddess_comment text?)
```

Sub-authored. Immutable after creation (no edits, no deletions — write-once to preserve authenticity). Goddess reads + optionally comments (one comment per entry, editable). Sub is notified on new comment.

### 20.2. Punishment & reward points

Simple signed ledger:

```
merit_event(id, sub_id, goddess_id, delta int, reason text,
            source enum 'ritual_completed'|'task_approved'|
                       'ritual_missed'|'task_rejected'|'manual',
            at)
```

`sub.points_balance = Σ delta`. Sources `ritual_completed` / `task_approved` auto-credit (configurable amounts per ritual/task). `manual` is goddess discretion.

Rewards / punishments tiers (defined goddess-side per empire):

```
reward_tier(id, goddess_id, label, points_cost, description)
punishment_tier(id, goddess_id, label, severity, description)
```

Sub can redeem a reward (`points_balance -= cost`, goddess notified to honor). Goddess can invoke a punishment tier (logs a `merit_event(delta<0)` + creates a task in `task` table with the punishment body).

### 20.3. Aftercare

```
sub_aftercare(sub_id PK, preferences text, do_not text, contact_preference
              enum 'alone'|'message'|'call'|'in_person', updated_at)
```

Displayed on goddess sub page after any "intense session" (detected via a manual "Session complete" button on the goddess side — v1 is manual, automatic detection deferred).

---

## 21. Toys, Devices & Physical Inventory

**Catalog-only** (non-connected items). Connected toys (Lovense, Qiui, …) live in §23 (TechDom).

### 21.1. Data model

```
toy_item(id, goddess_id, sub_id, category enum
         'chastity'|'plug'|'dildo'|'vibrator'|'estim'|
         'collar'|'cuff'|'harness'|'gag'|'impact'|
         'clamp'|'weight'|'other',
         label, description, photo_key?,
         approved bool, proposed_by enum 'goddess'|'sub',
         lock_code_enc bytea?,      -- chastity only, envelope-encrypted
         added_at, reviewed_at, reviewed_by)
```

### 21.2. Flow

- Goddess adds items directly (`approved=true`). Sub proposes items → `approved=false` until goddess approves. Rejection just deletes.
- Chastity devices: `lock_code_enc` encrypted with the same envelope scheme as medical (§25). Only goddess can decrypt — sub can write (first-time set) but cannot read.
- Inventory view `/goddess/subs/{id}/inventory` grouped by category with photos.

---

## 22. Blackmail & Consensual Non-Consent Vault

**⚠️ Legally gated.** No implementation until a threat-model doc and a consent framework (§25.3) are signed off by the goddess and reviewed against UK extortion law (Theft Act 1968 s. 21) and GDPR (art. 9 + erasure rights).

### 22.1. Principles

1. **Client-side encryption.** Plaintext never hits the server. Material is encrypted in-browser with a key derived from goddess's passphrase; the server stores only ciphertext + metadata.
2. **Explicit consent, re-affirmed on upload.** Each upload triggers a modal recording: consent level, valid-until date, revocation terms, signed hash of the consent text. Consent event stored in `blackmail_consent_event` (append-only).
3. **Revocation is immediate and absolute.** Sub clicks "Revoke" → row flagged `revoked_at`, server refuses to serve the blob, and a background job hard-deletes the R2 object within 24 h. UI shows a confirmation modal with legal language ("material will be destroyed; any screenshots held externally are outside the scope of this platform").
4. **Goddess-only read.** Sub cannot re-download after upload (prevent mis-use vs. their own copy). Admin has **no read path** — only `delete`.

### 22.2. Data model

```
blackmail_material(id, sub_id, goddess_id, kind enum
                   'photo'|'video'|'document'|'credential'|'note',
                   r2_key, ciphertext_sha256, iv, wrapped_key,
                   consent_event_id FK, valid_until date?,
                   revoked_at, destroyed_at, created_at)

blackmail_consent_event(id, sub_id, goddess_id, consent_text_sha256,
                        consent_text_version, scope enum
                        'upload'|'revoke'|'escalate_clause',
                        at, user_agent_hash)

blackmail_trigger(id, sub_id, kind enum 'hard'|'soft', body, at)
  -- Same shape as sub_trigger but blackmail-scoped
```

### 22.3. Linkage with contracts

Contract clauses of type `blackmail_consent` (§6.8) carry `linked_vault_id = blackmail_material.id`. Contract PDF references the material by id + ciphertext hash without exposing content. Revocation of the consent event → contract clause flagged `clause_invalidated` (goddess notified, contract remains `ACTIVE`).

---

## 23. TechDom & Remote Control

**⚠️ Secrets-vault gated.** No implementation until the KMS / envelope encryption layer (§25) is live, because this module stores OAuth tokens, API keys, and lock codes for physical devices.

### 23.1. Scope

Catalog of devices over which goddess has digital control: phones/computers (MDM, parental control), connected toys (Lovense, Qiui Cellmate, Kiiroo), smart-home nodes, geofencing / screen-time rules.

### 23.2. Data model

```
device(id, goddess_id, sub_id, kind enum
       'phone'|'computer'|'smart_home'|'toy_lovense'|'toy_qiui'|
       'toy_kiiroo'|'mdm'|'parental_control'|'geofence'|'other',
       label, vendor, model,
       access_token_enc bytea, refresh_token_enc bytea,
       permissions_json, status enum 'connected'|'disconnected'|'revoked',
       connected_at, last_checkin_at, revoked_at)

device_permission_grant(id, device_id, granted_at, granted_by,
                        revoked_at, scope_json)

device_event(id, device_id, kind enum 'command_sent'|'command_failed'|
             'status_change'|'token_refreshed',
             payload_json, at)
```

### 23.3. Adapters

Each vendor gets an adapter under `services/devices/<vendor>/` implementing a `DeviceAdapter` Protocol (`connect`, `send_command`, `disconnect`, `refresh_token`). V1 adapters planned: `lovense`, `qiui_cellmate`. Others stubbed. All HTTP calls go through the standard `external-service-adapter` pattern (timeouts, retries, no secrets in logs).

### 23.4. UI

- Goddess: `/goddess/subs/{id}/devices` — connected list, connect wizard (OAuth or manual token paste), command history, revoke-all button.
- Sub: `/devices` — read-only list of what the goddess controls ("transparency view").

---

# PART V — Integrations

## 24. Payment ingestion (webhooks / iframes)

> **🚫 SCOPE CUT 2026-04-16:** §24 in its entirety is OUT OF MVP. Debt_collector does not duplicate Throne / PayPal / Revolut / Cash App / YouPay. Subs declare each tribute manually; goddess validates. Migration `328e11d71888` dropped `payment_webhook_event` and `throne_connection`. Section retained for historical reference only.

Goal: reduce manual declaration by auto-creating validated `payment_declaration`s from provider webhooks. Each integration is optional per goddess and per method.

### 24.1. Generic `PaymentWebhookEvent` table

```
payment_webhook_event(id, provider enum 'throne'|'paypal'|'revolut'|'cashapp'|'youpay',
                      provider_event_id, payload_json, signature,
                      received_at, processed_at, result enum
                      'matched'|'unmatched'|'duplicate'|'rejected',
                      matched_declaration_id, notes)
```

Unique constraint `(provider, provider_event_id)` for idempotency.

### 24.2. Per-provider modules

- **Throne** (P1.2): `/webhooks/throne` + polling fallback. One `throne_connection` per goddess (token + account id). Sub matched by Throne handle → `payment_handle` on `user`.
- **PayPal IPN** (P1.4): `/webhooks/paypal`. Sub matched by PayPal email → `payment_handle`.
- **Revolut Merchant** (P1.4): `/webhooks/revolut`. Sub matched by reference field or handle.
- **Cash App** (P1.4): `/webhooks/cashapp`. Polling if no webhook available.
- **YouPay** (P1.5): iframe embed if T&C allow; deep-link fallback otherwise. No webhook → declared manually by sub with YouPay reference.

### 24.3. Flow

1. Webhook arrives → signature verified → row in `payment_webhook_event`.
2. Matcher resolves `sub_id` via `payment_handle` or free-text reference.
3. Match success → auto-create `payment_declaration(status=validated, source=ingested)` + `payment_allocation`. Goddess notified.
4. Match failure → row stays `unmatched`; goddess sees it in `/goddess/webhook-inbox` and manually assigns to a sub.

### 24.4. Provider toggles

`goddess_integration(goddess_id, provider, enabled bool, config_json_enc bytea, updated_at)` with provider-specific config (API tokens encrypted via §25 envelope).

---

# PART VI — Security & Privacy additions

## 25. Crypto envelope & consent framework

All Parts II–V sensitive data (medical, chastity codes, blackmail material, device tokens, provider tokens) use a common encryption envelope.

### 25.1. Key hierarchy

```
Root KEK (env var, rotated quarterly)
  └─ wraps per-goddess KEK  (in `goddess_kek(goddess_id, wrapped_kek, created_at)`)
       └─ wraps per-row DEK (column `wrapped_key` on each encrypted row)
             └─ encrypts row payload (AES-256-GCM, IV stored alongside)
```

Goddess passphrase derives a second wrapping key for the **blackmail vault only** (§22) → plaintext never exists server-side for that module. Decryption requires goddess to be logged in AND to re-enter her passphrase (cached in-memory for session, never in localStorage).

### 25.2. Implementation

- Library: **PyNaCl** (libsodium) for symmetric ops; **cryptography** package for AES-GCM.
- `services/crypto/envelope.py` with `encrypt(goddess_id, plaintext) -> (wrapped_key, iv, ciphertext)` and `decrypt(...)`.
- `services/crypto/vault.py` for blackmail-specific passphrase-derived keys (Argon2id KDF, 256-bit output).
- No keys in logs. No key material in Swagger examples.

### 25.3. Consent framework

```
consent_text(id, version, slug, body_md, effective_from)

consent_acceptance(id, user_id, consent_text_id, accepted_at,
                   scope_json, revoked_at)
```

Every sensitive action (vault upload, device connect, medical edit) references a `consent_text` slug + version. Goddess or admin updates consent text → version bump; users see a prompt to re-accept on next relevant action. Export `GET /consent/me` returns all acceptances as JSON (GDPR Art. 15 subject access).

### 25.4. Retention & erasure

| Domain | Retention |
|--------|-----------|
| Auth logs, `admin_action` | 18 months |
| `payment_webhook_event.payload_json` | 90 days, then trimmed to metadata |
| Journal entries | Indefinite; sub can request erasure (goddess must approve) |
| Blackmail material after revocation | Hard-deleted within 24 h; row kept with `destroyed_at` for audit |
| Medical info on sub deletion | Purged immediately (GDPR erasure) |

Daily `retention_gc` cron enforces.

---

## 26. Data Model additions — summary

New tables introduced by Parts II–VI:

```
-- §16
sub_profile, sub_photo, status_event, wishlist_item, tribute_minimum, penalty_rule
-- §17
kink_category, kink_item, sub_kink_rating
-- §18
sub_limit, sub_trigger, sub_medical, sub_safeword
-- §19
ritual, ritual_occurrence, task
-- §20
journal_entry, merit_event, reward_tier, punishment_tier, sub_aftercare
-- §21
toy_item
-- §22 (gated)
blackmail_material, blackmail_consent_event, blackmail_trigger
-- §23 (gated)
device, device_permission_grant, device_event
-- §24
payment_webhook_event, goddess_integration, throne_connection
-- §25
goddess_kek, consent_text, consent_acceptance
```

All tables carry `goddess_id` where applicable and are covered by the same row-level ownership checks as existing core tables.

---

## 27. API surface — summary

New router modules, each under `server/routers/`:

```
sub_profile.py      -- §16
kinks.py            -- §17
limits.py           -- §18
rituals.py          -- §19 (rituals + tasks)
journal.py          -- §20
toys.py             -- §21
vault.py            -- §22 (gated)
devices.py          -- §23 (gated)
webhooks/
  throne.py         -- §24
  paypal.py
  revolut.py
  cashapp.py
consent.py          -- §25
```

Every route: `summary`, `description`, explicit `response_model`, `status_code`, `tags`, `responses={}`. Pydantic schemas use `Field(..., description="…", examples=[…])`.

---

## 28. Frontend surface — summary

New routes and components:

```
/profile                -- sub self-profile (tabs: identity, kinks, limits, devices-readonly)
/today                  -- sub daily dashboard (rituals + tasks + journal entry CTA)
/journal                -- sub journal history
/devices                -- sub read-only device transparency
/wishlist               -- sub wishlist view

/goddess/subs/:id/
  profile               -- identity + photos queue
  kinks                 -- kink matrix
  limits                -- limits & safety card (safeword banner)
  rituals               -- ritual + task review
  journal               -- journal reader with comment
  inventory             -- toy inventory
  devices               -- connected devices (gated)
  vault                 -- blackmail material (gated)
/goddess/review-queue   -- cross-sub: ritual occurrences + submitted tasks
/goddess/photo-queue    -- pending photo approvals
/goddess/kinks/proposals-- custom-kink proposals
/goddess/webhook-inbox  -- unmatched webhook events (§24)
```

Every component respects 300-line cap, named exports, no inline styles. UUIDs hidden from `goddess` / `sub` roles.

---

## 29. Build Sequence — mapping to roadmap.md

| Roadmap phase | Covers | Gated? |
|---|---|---|
| A — Residual core | §7 ingestion toggles, §11.2 photos, §16.5 wishlist plumbing | No |
| B — Identity ext | §16.1 – §16.4 | No |
| C — Kinks | §17 | No |
| D — Limits & safety | §18 (except medical encryption) | No |
| E — Rituals & tasks | §19 | No |
| F — Journal / merits / aftercare | §20 | No |
| G — Toys inventory | §21 | No |
| H — Contract clauses + renewal | §6.8, §6.9 | No |
| I — Wishlist + tribute minimum + penalty rules | §16.5 | No |
| J — Crypto envelope + consent framework | §25 | No (prerequisite) |
| K — Blackmail vault | §22 | **Yes — legal review first** |
| L — TechDom / devices | §23 | **Yes — secrets vault + per-vendor legal terms** |
| M — Payment ingestion | §24 | No |

End of design.
