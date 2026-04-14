# TODO

## 1. Base64 signature instead of storing the signed PDF

- Drop `signed_pdf_url` and `signed_pdf_sha256` on `DebtContract`.
- Add `signature_b64` (TEXT) — PNG encoded as a base64 data URI.
- Migration to swap the columns.
- `sign_contract` controller: store `signature_b64`, stop calling the storage service.
- `GET /debts/{id}/pdf` endpoint: regenerate on the fly via `generate_contract_pdf(...)` and stream inline (`Response(pdf, media_type="application/pdf")`).
- Seeds: replace `signed_pdf_url=…` with a 1×1 transparent PNG encoded as base64.
- Remove `services/storage/*` if no other route still uses it after this change.

## 2. Throne API integration for automatic payment ingestion

- Investigate the Throne API / webhook (auth, payload format, HMAC signature).
- Store one "Throne connection" per goddess (token + account id).
- Webhook endpoint `/webhooks/throne` → verify signature → match sub by Throne handle → create an auto-validated `PaymentDeclaration` with `source = goddess_recorded`.
- Goddess dashboard: "Auto-detected via Throne" badge on payments received via webhook.
- Polling fallback if no webhook is available.

## 3. Redesign the signed-contract PDF template

- Redesign `server/services/pdf/templates/contract.html`: clear hierarchy, named sections (parties, principal, schedule, late-penalty clauses, exit, signatures).
- Add the full repayment schedule (one row per period with due date + amount due + interest).
- Print-ready style (A4, margins, pagination, footer with contract id + sha).
- Framed signature block with `signed_at` in the Europe/London timezone.
- Include a goddess header (logo + display_name) and a full sub info block.

## 4. Payment ingestion via the goddess' own payment methods (receipt webhooks)

- For each supported goddess-side `PaymentMethodType`, wire up a provider-specific webhook (PayPal IPN, Revolut Merchant, Cash App, etc.).
- `PaymentWebhookEvent` table for idempotency (provider event id).
- Payload → sub matching: by payment handle (see task 6) or free-text reference.
- Auto-create a validated `PaymentDeclaration` + immediate allocation.
- Goddess UI to enable/disable auto-ingest per method and view the event log.

## 5. YouPay iframe integration

- Check the YouPay terms: is iframe embedding allowed? (X-Frame-Options / CSP on YouPay's side).
- If allowed: widget embedded on the sub's "Declare payment" page, prefilled with amount + reference.
- Otherwise: deep-link fallback (open YouPay in a new tab with query params).
- Contact YouPay support if the documentation is unclear.

## 6. Avatars + sub profiles controlled by the goddess

- Seed 10 default avatars (in `client/src/assets/avatars/`) + a "default" avatar assigned at sign-up.
- `avatar_key` field on `User` (enum or FK to an `Avatar` table).
- Only the goddess can edit a sub's `avatar_key`, `first_name`, `last_name`, `display_name`, `notes`.
- `ProfileChangeRequest` table: a sub can request a change → the goddess approves / rejects / proposes a "cost" (e.g. 50 GBP). If the sub accepts the cost, generate a special entry `PaymentDeclaration` "profile_change_fee" → change applied on validation.
- The sub **can** edit exactly one field: their `payment_handle` (Throne / PayPal username). Add this field to the sign-up form + to `/sub/profile`.
- Everywhere the goddess lists/views her subs → avatar + first name + last name (never the UUID).
- `payment_handle` is the matching key for the Throne webhook (see task 2).

## 7. Goddess dashboard: charts and styled aggregates

- Add a dashboard page with:
  - Monthly revenue (line chart: rolling + tributes + contracts).
  - Breakdown by payment method (pie/donut).
  - Subs by status (stacked bar).
  - Top 5 subs by generated revenue (leaderboard).
  - 30-day late rate (sparkline).
  - Active vs. completed vs. breached contracts (progress bars).
- Library: recharts or visx (ESM, lightweight, tailwind-friendly).
- Style consistent with `tokens.css`, no inline colours.

## 8. Improve contract preview

- `/goddess/contracts/:id/preview` page (and sub-side before signing):
  - Header summary (principal, duration, frequency, rate).
  - Full schedule: table with period #, due date, amount due, running total.
  - "Late payment" / "early buyout" / "breach" simulator (use the existing `/debts/simulate`).
  - Balance decay chart over time.
  - "Draft" PDF export (same template as task 3, with a "DRAFT" watermark).

## 9. More goddess photos + multi-tenant later

- `client/src/assets/goddess/` (or `public/goddess/`) folder with multiple photos (hero, accent, cards).
- `<GoddessPhoto variant="hero|portrait|accent" />` component to centralise usage.
- Integration on: landing, goddess dashboard, public invitation page, login.
- Multi-tenant: for now every goddess points at the same image pool. Later, a `GoddessAsset` table with per-tenant upload and override.
