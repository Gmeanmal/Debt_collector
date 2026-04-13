# Debt Collector — Use Cases

Short tour for Goddess Mean Mal. All amounts £, UK time, English UI, invite-only.

---

## What the app does

Tracks money your subs owe you under **two independent systems**:

- **Rolling** — a weekly fee (e.g. £50 every Friday 12:00). Late = amount multiplies each day (Sat=£100, Sun=£150…). Reset when paid.
- **Debt contract** — signed debt with interest, penalties, buyout clause, optional mid-contract additions.

The app does **not** process money. Subs pay you via Throne / PayPal / bank / Apple Pay / etc. and declare it. You validate.

---

## Your daily flow

1. Open dashboard → see **Late payments**, **Pending validations**, **Pending contracts**.
2. Validate / reject payment declarations (one click each). Re-categorize if needed.
3. Sign off on buyouts. Add penalties / adjustments when you feel like it.
4. Check the **Total drained** counters for satisfaction.

---

## Inviting a sub

- Click **Invite** → set entry tribute amount (required, decided per sub) → copy link → send via X/DM.
- Sub signs up → pays entry tribute externally → declares it → you validate → he's active.

## Attributing a rolling

- On his page, set amount, day, time. Unilateral, no acceptance needed.
- Change / pause / set to £0 anytime.

## Creating a debt contract

Fill a form:
- Principal, interest % (monthly or yearly), duration, payment frequency
- Minimum payment per period
- Late penalty severity: **Light / Medium / Severe** (Severe = dette ingérable sans surpaiement)
- Can you add surprise penalties? (yes/no)
- Can you add amounts mid-contract? (no / freely / sub-approval needed)
- Exit amount (used for buyout + breach)

Live simulation shown as you fill it in.

Send → sub signs OR counter-proposes **once**. You accept or reject his counter. Final version = he signs or leaves pending. **You always have the last word.**

Sub can also propose a contract to you, same negotiation rules.

## Payments

Sub declares every payment with: amount, method used (from your list), category (entry / rolling / weekly debt / debt payment / buyout / tribute).

You validate, re-categorize, or reject. You can also record a payment yourself if he forgets.

## Buyout

Sub clicks **Buy out** → sees amount = `exit_amount × time_spent / total_duration` → pays → declares → you validate → contract closes.

## Breach

Sub ghosts → you click **Mark as breached** → all his active contracts close, account blacklisted. His identity goes in your **Blacklist** page.

**Forgive** button unlocks him later (you enter what he paid to come back).

## Per-sub view

One page per sub: his rolling, his contracts, his full payment history, his drained total.

## Your payment methods

Settings → list every way you receive money (Throne / PayPal / bank / Apple Pay / etc.). Shown to subs when they pay.

---

## Sub side (so you know what he sees)

- Dashboard: what he owes this week, countdown to deadline, late amount in red.
- Declares every payment (can edit/cancel while pending).
- Receives / signs / counters contracts.
- Can buy out or approve adjustments (if contract requires it).
- **Cannot**: stop a rolling himself, DM anyone, see other subs, browse publicly.

---

## What's NOT in the app

- No card payments / no financial processing.
- No chat. DM him on X as usual.
- No public profiles, no search.
- No IP/browser tracking (GDPR).
- One Goddess (you) for now. Multi-Goddess maybe in a year.

---

**Read this. If anything feels wrong, tell us before we build.**
