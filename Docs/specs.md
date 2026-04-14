# Debt Collector — Design Document

**Date:** 2026-04-13
**Status:** Draft, pending approval
**Companion doc:** `use_cases.md` (user journeys, Dom-readable)

---

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
- Automated tests (added at the end once feature-complete)
- Public marketing / SEO / indexability (invite-only)
- Chat / DMs (use external platforms)

---

## 2. Roles

| Role | Scope |
|------|-------|
| `admin` | You (developer). Full CRUD on every entity via custom admin UI. Separate login. No MFA in v1. |
| `goddess` | Mean Mal. Full control over her subs, contracts, rollings, payments, blacklist. |
| `sub` | A slave, attached to a Goddess via `goddess_id` FK. Can only see and act on his own data. Joins via invite link only. |

The `goddess_id` column is added on every sub-owned table **from day one** to make the future multi-Goddess expansion a non-breaking change.

---

## 3. Currency, Language, Timezone

- Currency: **GBP (£)** everywhere, no conversion.
- Language: **English only** (UI, PDF contracts, emails).
- Timezone: **Europe/London** hardcoded for all deadline computations and the daily cronjob. DST handled by `pytz` / `zoneinfo`. Client-side, deadlines are displayed in the viewer's local timezone with a label ("Due Friday 12:00 UK = 13:00 your time").

---

## 4. Authentication & Onboarding

### 4.1. Invitation flow

1. Goddess creates an invitation (UUID token, entry tribute amount, optional note, expiry).
2. She copies the URL (`/invite/<token>`) and sends it externally.
3. Sub opens the page, fills the signup form: `username`, `first_name`, `last_name`, `email`, `password`, optional `twitter_handle`, optional `source_note`.
4. Backend creates a `sub` user linked to the Goddess, in state `PENDING_ENTRY_TRIBUTE`, and invalidates the invitation token.
5. Sub declares the entry tribute payment. Goddess validates → state → `ACTIVE`.

### 4.2. Session auth

- Password hashing: **Argon2id** via `argon2-cffi`.
- Sessions: **JWT** access token (15 min) + refresh token (30 days, HttpOnly cookie).
- Endpoints enforce role + ownership (`sub` can only touch his own rows, `goddess` only her own subs).
- Password reset: email via **Resend**. Reset token = signed JWT, TTL 1h.

### 4.3. Account states

```
PENDING_ENTRY_TRIBUTE → ACTIVE → BLACKLISTED → ACTIVE (on forgive)
```

Blacklisted users cannot log in (401 at login endpoint, clear error message).

### 4.4. Admin impersonation

Admins can issue a scoped access token that acts as another user without knowing their password. The issued JWT carries an `imp` claim = admin's own UUID; `sub` is the impersonated user. The client shows a persistent banner ("Impersonating <display_name> — return to admin") so the operator can swap back in one click; returning re-issues an unscoped admin token. All mutations performed during impersonation are recorded with the acting admin's id in audit logs. Impersonation tokens inherit the normal 15-minute access TTL (no refresh).

---

## 5. Rolling Tribute

### 5.1. Attribution

One rolling per sub. Goddess creates/updates unilaterally (no sub acceptance). Fields:

- `amount` (GBP, `0` = rolling disabled / hidden)
- `deadline_day` (enum Mon–Sun, default Fri)
- `deadline_time` (time, default 12:00)
- `late_multiplier_per_day` (int, default 1 → amount × (1 + days_late))
- `paused` (bool)
- `notes` (free text)

### 5.2. Cycle mechanics

A **rolling week** runs from one deadline to the next (e.g. Friday 12:00 to next Friday 12:00). A single validated `rolling` payment of at least the due amount resets the cycle. Amount due within a cycle:

```
due = amount * (1 + max(0, days_since_deadline) * late_multiplier_per_day)
```

Mid-afternoon Friday (before 24:00 on the deadline day) counts as `days_late = 0`. Saturday = 1 day late. Sunday = 2. No fractional-day grace; the 20% Friday-afternoon grace in Mean Mal's original description is **not** implemented (simplification).

If sub pays less than `due` at deadline, the cycle is considered missed → a notification is pushed to both sides, and the multiplier continues to grow until he pays in full.

---

## 6. Debt Contract

### 6.1. Contract fields

All stored on the `debt_contract` row:

| Field | Type | Notes |
|-------|------|-------|
| `principal` | decimal | Starting balance |
| `interest_rate` | decimal | Stored as fraction (0.20 = 20%) |
| `interest_period` | enum `monthly` \| `yearly` | If yearly → converted to monthly-equivalent via AER: `r_month = (1 + r_year)^(1/12) − 1` |
| `duration_periods` | int | Number of payment periods |
| `payment_frequency` | enum `weekly` \| `biweekly` \| `monthly` | |
| `minimum_payment` | decimal | Per-period minimum to avoid penalty |
| `late_penalty_severity` | enum `light` \| `medium` \| `severe` | UI preset; drives default `late_penalty_percent` |
| `late_penalty_percent` | decimal | Applied once per missed period: `balance *= (1 + late_penalty_percent)` |
| `dom_can_add_surprise_penalty` | bool | Unlocks "Add penalty" button |
| `mid_contract_addition_mode` | enum `disabled` \| `dom_controlled` \| `sub_approval_required` | |
| `exit_amount` | decimal | Used for buyout AND breach formula |
| `status` | enum (see state machine) | |
| `signed_pdf_url` | string? | Populated after signature |
| `signed_pdf_sha256` | string? | Integrity proof |
| `signed_at` | datetime? | |

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
  → COMPLETED (full repayment — rarely, given compound interest design)
```

**Negotiation limit:** at most one counter-proposal round per side. After that, the sub can only sign the final version or leave it in `PENDING_SUB_SIGNATURE`. Goddess has the last word. Goddess can close a `PENDING_*` contract at any time → `CANCELLED_BY_DOM`.

### 6.3. Signature

- Sub draws signature on HTML canvas → PNG image.
- Backend generates PDF via **WeasyPrint** (HTML template + embedded signature PNG).
- PDF hash (SHA-256) + signing timestamp stored on the contract row.
- PDF uploaded to **Cloudflare R2**, presigned download URLs for both parties.
- No IP / user-agent logging (GDPR-minimal).

### 6.4. Lifecycle events (ledger)

Every balance-modifying event is a row in the `debt_event` ledger table:

| Event type | Created by | Effect |
|------------|-----------|--------|
| `period_interest` | cronjob | `balance *= (1 + r_month * period_factor)` at start of each period |
| `payment_applied` | validation of `weekly_debt` / `debt_payment` | `balance -= amount`; `weekly_debt` also satisfies the period |
| `late_penalty` | cronjob when period ends without min payment | `balance *= (1 + late_penalty_percent)` |
| `surprise_penalty` | Goddess action | `balance += amount`, reason logged |
| `adjustment` | Goddess action (or sub-approved) | `balance += amount`, reason logged |
| `buyout_paid` | buyout validation | sets `total_paid += amount`, status → CLOSED |

The `debt_contract.balance` column is always the sum of events (or cached and recomputed on demand — decide in plan phase). The event log is **the truth**; the cached balance is a read optimization.

### 6.5. Simulation

At contract-creation time, the form shows a live projection (period-by-period balance evolution) assuming:
- Minimum payment each period, no late, no penalties, no adjustments.

Plus a warning banner for `severe` penalties: if `balance × (1 + r_month) − min_payment > balance`, display "debt will grow faster than minimum payment can repay it".

### 6.6. Buyout

Formula:

```
exit_due(t) = exit_amount * (t / duration_periods)
```

where `t` is the number of elapsed periods since signature. Workflow:

1. Sub clicks **Buy out** → sees the computed amount + payment methods.
2. Sub pays externally, declares payment (category `buyout`).
3. Goddess validates → contract state → `CLOSED`, `total_paid += exit_due`.
4. Goddess rejects → state → `ACTIVE`, sub notified.

### 6.7. Breach

Goddess clicks **Mark as breached** on any `ACTIVE` contract. On breach:

1. That contract → `BREACHED` (terminal).
2. **All other active contracts of that sub** → `BREACHED` (cascade).
3. Sub's account → `BLACKLISTED`.
4. Blacklist entry created with: first name, last name, username, X handle, breach date, reference contract, balance at breach.

Forgiveness: Goddess clicks **Forgive** → account → `ACTIVE`, form asks "reinstatement fee paid" (GBP, logged in sub history). Previously breached contracts stay `BREACHED`.

---

## 7. Payment Declarations

### 7.1. Data model

Two tables:

**`payment_declaration`** — what the sub says he paid (or what the Goddess recorded directly).

- `sub_id`, `amount`, `method_id` (FK to Goddess payment method), `external_timestamp` (nullable), `note`, `category` (enum), `status` (`pending` / `validated` / `rejected` / `cancelled`), `source` (enum `sub_declared` / `goddess_recorded`), `created_by` (`sub` or `goddess`), `declared_at`, `validated_at`, `validated_by`, `rejection_reason`.
  - `source` is rendered as a badge in both the sub history and the goddess validation queue so the origin of every tribute is visible at a glance.

**`payment_allocation`** — the validated ledger entry, one per declaration (no split).

- `declaration_id` (FK), `target_type` (enum `entry` / `rolling` / `weekly_debt` / `debt_payment` / `buyout` / `tribute`), `target_id` (nullable FK — required for debt/buyout targets, null for `entry` / `rolling` / `tribute`), `amount`.

When the Goddess validates, she can re-categorize before validation (updates `category` on the declaration). No split (each tribute = one declaration).

### 7.2. Goddess direct entry

Goddess can skip the declaration step and create a `validated` declaration + allocation in one go ("Record payment" button on the sub page). Sub sees it in his history with a "recorded by Goddess" tag.

### 7.3. Derived counters

- `sub.total_drained = Σ amounts of validated allocations for this sub`
- `goddess.total_drained_global = Σ amounts across all subs`
- `debt_contract.total_paid = Σ allocations of target_type ∈ (weekly_debt, debt_payment, buyout) for this contract`
- `rolling.last_paid_at = max(created_at) of validated rolling allocations for this sub`

All counters are **derived at read time** from the allocation ledger, not cached on parent rows. The DAO aggregates via `SUM()` each query; this keeps the ledger as single source of truth and avoids backfill after rejections/cancellations.

### 7.4. Read-model endpoints

Dashboards need pre-aggregated views. These are pure read endpoints (no write verbs):

- `GET /goddess/payments/weekly` — tribute volume per ISO week for the calling Goddess.
- `GET /goddess/subs/late` — active subs with overdue rolling or weekly debt instalments.
- `GET /sub/planning` — 30-day forward calendar of expected rolling + contract payments for the calling sub.

Aggregation lives in controllers; routers only shape HTTP. Responses are plain DTOs, not DB rows.

---

## 8. Cronjob (daily, 08:00 Europe/London)

Embedded **APScheduler** inside the FastAPI process. For every active sub:

### 8.1. Rolling

- If `rolling.amount > 0` and deadline **in next 24h** and no rolling payment validated for the current cycle → push notif to sub (reminder).
- If deadline **passed** without validated rolling payment → recompute due amount (multiplier × days late), push notif to sub and Goddess, update "late payments" page.

### 8.2. Debt contracts

- For each `ACTIVE` contract where period ends **in next 24h** without a validated `weekly_debt` for that period → push notif to sub (reminder).
- For each `ACTIVE` contract where period **just ended** without validated `weekly_debt`:
  - Apply `late_penalty_percent` to balance (new `debt_event` of type `late_penalty`)
  - Start new period: apply `period_interest` (capitalization)
  - Push notifs to sub and Goddess
- For each `ACTIVE` contract where period **just ended** with validated `weekly_debt`:
  - Start new period: apply `period_interest` only, no penalty.

### 8.3. Idempotency

Each cronjob run is idempotent: events carry a `(contract_id, period_index, event_type)` uniqueness key so re-running the same day (manual trigger, restart) doesn't double-apply.

---

## 9. Notifications

### 9.1. In-app (primary)

- Table `notification(id, user_id, type, payload_json, created_at, read_at)`.
- UI: bell icon with unread badge, drawer/panel on click, deep-links to relevant pages.

### 9.2. Real-time WebSocket

- Endpoint `GET /ws/notifications` (JWT-authenticated via `?token=` query or cookie).
- Server-side `NotificationPublisher` abstraction: in-process broadcast in v1, swappable for Redis pub/sub later.
- On DB insert of a `notification`, publisher emits to the target user's WS channel.
- Client reconnects with backoff; falls back to polling (`GET /notifications?unread=true` on window focus) if WS fails.

### 9.3. Email

**Resend** (100 emails/day free tier). Used only for:

- Password reset (link with JWT, TTL 1h).

Invitations are **not** sent by the app — Goddess sends the URL herself externally.

---

## 10. Data Model (overview)

```
goddess (id, display_name, email, password_hash, ...)

user (id, username, email, password_hash, role, status,
      goddess_id FK, first_name, last_name, bio, avatar_url,
      twitter_handle, source_note, ...)

invitation (id, token, goddess_id, entry_tribute_amount, note, expires_at, used_at)

payment_method (id, goddess_id, name, type, handle_or_link, note, enabled, sort_order)

rolling_tribute (id, sub_id, goddess_id, amount, deadline_day, deadline_time,
                 late_multiplier_per_day, paused, notes, last_paid_at)

debt_contract (id, sub_id, goddess_id, principal, interest_rate, interest_period,
               duration_periods, payment_frequency, minimum_payment,
               late_penalty_severity, late_penalty_percent,
               dom_can_add_surprise_penalty, mid_contract_addition_mode,
               exit_amount, status,
               signed_pdf_url, signed_pdf_sha256, signed_at, created_at, ...)
               -- NB: total_paid / balance are derived from the ledger at read time (see §7.3), not cached columns.

debt_event (id, contract_id, event_type, amount, reason, period_index,
            created_by, created_at)

debt_adjustment (id, contract_id, amount, reason, status, proposed_by,
                 resolved_by, resolved_at)

payment_declaration (id, sub_id, goddess_id, amount, method_id,
                     external_timestamp, note, category, status, source,
                     created_by, declared_at, validated_at, validated_by,
                     rejection_reason)

payment_allocation (id, declaration_id, target_type, target_id, amount)

notification (id, user_id, type, payload_json, created_at, read_at)

blacklist_entry (id, goddess_id, sub_id, reason, contract_ref_id,
                 balance_at_breach, breached_at, forgiven_at,
                 reinstatement_fee_paid)
```

All sub-owned tables carry `goddess_id` for future multi-tenant isolation.

---

## 11. Architecture

### 11.1. Backend

- **FastAPI** (Python 3.12), ASGI via Uvicorn.
- **SQLModel** (SQLAlchemy 2.0) + Pydantic.
- **Alembic** for migrations.
- **PostgreSQL 16**.
- **asyncpg** driver (async everywhere).
- **APScheduler** in-process for the daily cronjob.
- **WeasyPrint** for PDF generation.
- **boto3 / aiobotocore** for R2 (S3-compatible).
- **Resend** Python SDK for email.
- **argon2-cffi** for passwords, **PyJWT** for tokens.
- Layered folder structure: `routers/` → `controllers/` → `daos/` → `models/`, with `services/` for external adapters (R2, Resend). Consistent with `BEST_PRACTICES.md` from `Malverse_Games`.

### 11.2. Frontend

- **React 19** + TypeScript + **Tailwind CSS**.
- **Vite** dev server, production build static.
- **TanStack Query** for server state.
- **openapi-fetch** typed client, types generated from `/openapi.json`.
- **React Router** for routing.
- **Zod** for client-side schema validation.
- Folder structure: `components/` → `hooks/` + `services/` → `api/` (one-way imports), consistent with `BEST_PRACTICES.md`.
- 300-line limit per component.

### 11.3. Admin UI (custom, in-app)

- Separate route namespace `/admin` behind an `admin`-role guard.
- Reusable `<AdminTable>` / `<AdminForm>` components parameterized by entity schema (generated from OpenAPI / Zod).
- One page per entity: users, invitations, rolling_tributes, debt_contracts, debt_events, debt_adjustments, payment_declarations, payment_allocations, notifications, blacklist_entries, payment_methods.
- Every field editable, every row deletable, pagination + filters + search.
- Backend exposes `/admin/<entity>` routes with unrestricted CRUD for role `admin`.

### 11.4. Hosting (deferred)

Decision postponed until after development. Candidates:

- Hetzner CX22 VPS (~£46/yr, full-stack Docker Compose, no cold starts, recommended) — or
- Free-tier combo (Cloudflare Pages + Fly.io + Neon, ~£8/yr, cold-start caveats)

All code is Docker-based → portable between options.

---

## 12. Security & Privacy

- Argon2id password hashing with sensible defaults (memory=64 MB, time=3, parallelism=4).
- JWTs signed with HS256, rotating signing keys planned for later.
- Rate limiting on login + signup + invitation endpoints (in-memory dev, Redis optional in prod).
- CORS locked to the production domain.
- No IP, no user-agent stored (GDPR-minimal).
- Blacklist retention is indefinite; forgive action doesn't delete, only unlocks the account.
- Signed PDFs on R2 behind presigned URLs (TTL 15 min).
- Password reset tokens one-time use.

---

## 13. Financial Math (reference)

### Monthly rate from yearly (AER → APR-monthly)

```
r_month = (1 + r_year) ^ (1/12) − 1
```

### Period factor (if `payment_frequency` ≠ monthly)

```
weekly   → period_factor = 12 / 52 ≈ 0.2308   (r_period = r_month * 12/52)
biweekly → period_factor = 12 / 26 ≈ 0.4615
monthly  → period_factor = 1
```

### Interest capitalization at period start

```
balance *= (1 + r_month * period_factor)
```

### Late penalty on period miss

```
balance *= (1 + late_penalty_percent)
```

### Buyout amount

```
exit_due(t) = exit_amount * (t / duration_periods)
```

### Rolling amount due

```
due = amount * (1 + max(0, days_late) * late_multiplier_per_day)
```

---

## 14. Open Questions / Deferred Decisions

- **Hosting**: deferred to end of dev.
- **Tests**: no tests during initial build; retrofit test coverage once feature-complete.
- **Multi-tenant UI**: schema is ready (FK-based isolation), but Goddess-onboarding UX is not designed in this doc. Will be a separate spec when the expansion happens.
- **Token expiry on invitations**: current default 7 days, reconfigurable per invite.
- **Rolling cycle anchor**: first rolling cycle starts at attribution → next occurrence of `deadline_day` at `deadline_time`. Edge case: attribution made after this week's deadline has passed → cycle starts next week (no immediate past-due).

---

## 15. Build Sequence (rough)

A separate implementation plan will break this into executable steps. Rough order of foundations:

1. Repo scaffolding (backend + frontend + docker-compose for dev)
2. Auth + user/goddess/sub base + invitation flow
3. Payment methods + payment declaration/validation (skeleton)
4. Rolling tribute CRUD + cronjob skeleton + WS notifications
5. Debt contract CRUD + negotiation state machine + simulation
6. Debt event ledger + period capitalization + penalties + cronjob full logic
7. Mid-contract adjustments + surprise penalties
8. PDF generation + signature canvas + R2 upload
9. Buyout flow
10. Breach / blacklist / forgive
11. Dashboards (Goddess + sub)
12. Admin UI
13. Polish, accessibility, empty states, error handling
14. Tests retrofit
15. Hosting decision + deployment

---

End of design.
