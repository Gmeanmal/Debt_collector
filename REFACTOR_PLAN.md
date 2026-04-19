# REFACTOR_PLAN.md — Visual refonte towards the `debt-app` design handoff

> Scope: **presentation only**. Business logic, API calls, state, routing, tests,
> types stay untouched. We only rewrite `styles/`, `components/**`, restyle
> `routes/**` JSX, and pivot layout chrome.
>
> Working method: each step is atomic, independent, checkbox-tracked. Sonnet runs
> the steps under Opus orchestration. Commits happen per "grande partie"
> (= one phase below). Every 4 phases → clear context + human gate.

---

## 0 · Target design system — summary

Source: `Docs/design_bundle/debt-app/project/tokens.css` + `shell.jsx` +
`screens-*.jsx` + uploads.

### 0.1 Colour tokens (rebuilt from scratch — replace existing scheme)

| Scale | Stops |
|-------|-------|
| `--pink-*` | 50 `#fff0f7`, 100 `#ffd9ea`, 200 `#ffb0d4`, 300 `#ff82ba`, **400 `#ff4fa3` (primary, mandatory)**, 500 `#ef2b89`, 600 `#c81569`, 700 `#8f0d49`, 800 `#55072b`, 900 `#2e0417` |
| `--lime-*` (signature accent) | 100 `#eaf7c6`, 200 `#d4ef8a`, 300 `#b8e14f`, **400 `#9bc928`**, 500 `#6f961a` |
| `--cream-*` (light surfaces) | 50 `#fbf6ed`, 100 `#f3ecdd`, 200 `#e7dcc3`, 300 `#cdbd9c`, 400 `#9a8b69` |
| `--ink-*` (plum-near-black) | 100 `#6e5c66`, 200 `#3f2e38`, 300 `#271a22`, 400 `#180f15`, 500 `#0f090d` |
| Semantic raw | `--ok #3b7a52`, `--warn #9a6516`, `--bad #b8253d` |

Theme-scoped semantic aliases:

| Alias | Light (`cream & ink`) | Dark (`plum-ink & hot pink`) |
|-------|----------------------|-------------------------------|
| `--bg` | `--cream-50` | `--ink-400` |
| `--bg-elev` | `#ffffff` | `#221520` |
| `--bg-sunken` | `--cream-100` | `--ink-500` |
| `--bg-inset` | `--cream-200` | `#33222d` |
| `--line` | `rgba(24,16,21,0.12)` | `rgba(255,214,230,0.10)` |
| `--line-strong` | `rgba(24,16,21,0.26)` | `rgba(255,214,230,0.22)` |
| `--text` | `--ink-400` | `#f7ecf1` |
| `--text-mute` | `--ink-200` | `#b8a3ae` |
| `--text-faint` | `#8a7a82` | `#7a6672` |
| `--accent` | `--pink-400` | `--pink-400` |
| `--accent-ink` | `#ffffff` | `--ink-400` |
| `--accent-soft` | `--pink-50` | `#3a0f22` |
| `--accent-trace` | `--pink-100` | `#2a0a18` |
| `--accent-deep` | `--pink-700` | `--pink-200` |
| `--signal` | `--lime-400` | `--lime-300` |
| `--signal-soft` | `--lime-100` | `#1e2a10` |
| `--signal-ink` | `#2a3b06` | `--lime-200` |
| `--ok-bg/-ink` | `#e2eed9` / `#2d5537` | `#1a3225` / `#8bc497` |
| `--warn-bg/-ink` | `#f1e3ca` / `#6c4710` | `#33240f` / `#e3b36a` |
| `--bad-bg/-ink` | `#f9dfe9` / `--pink-700` | `#3a1220` / `#ff9cc0` |
| `--shadow-sm/md` | hairline drops | deeper drops on dark |

**Rule:** drop `--color-violet-*`, `--color-gold-*`, `--color-debt-*` from the
old charter. Crimson-red is replaced by `--bad-*`. Violet and gold are out of
scope for the refonte.

### 0.2 Typography

| Role | Family | Notes |
|------|--------|-------|
| Display / section titles / big stats | **Playfair Display** serif, italic 400–500 for editorial voice, upright 600–800 for weight | via Google Fonts |
| UI body / data / tabular numerals | **Inter** 300-700 | body default |
| Mono (IDs, numeric keys, eyebrows) | **IBM Plex Mono** 400-600 | letter-spacing 1.4-1.6, uppercase for eyebrows |

Body font-feature-settings: `"ss01","tnum","cv11"`. Antialiased.

### 0.3 Spacing & layout

- 4-px base grid; content gutters 24/32 (mobile/desktop), 60 px for marketing sections.
- Sidebar 232 px fixed, grouped nav, role avatar at foot.
- Topbar ~56 px with optional eyebrow crumbs (mono, uppercase, 10 px).
- Frame size for canvas previews: 1280×900.
- Card padding baseline 18 px; Stat 16 px; SectionTitle margin-bottom 18 px.

### 0.4 Radii

`6 px` buttons/chips, `10 px` cards/panels, `999 px` avatars/pills.
(No more `--radius-lg 18px`/`xl 28px` — editorial keeps radii tight.)

### 0.5 Shadows & motion

- `--shadow-sm: 0 1px 2px rgba(ink,.06|.5)`
- `--shadow-md: 0 2px 14px rgba(ink,.09|.55)`
- Motion stays from existing charter (`fast 140`, `normal 220`, `slow 360`, ease `cubic-bezier(0.16,1,0.3,1)`).

### 0.6 Key primitives (from `shell.jsx`)

`BrandMark`, `Logo`, `Sidebar`, `Topbar`, `AppShell`, `Button` (primary / ghost /
soft / ink / danger), `Badge` (neutral / ok / warn / bad / pink / ink), `Card`,
`Stat`, `Row`, `SectionTitle`, `Divider`, `Avatar`, `Money`, `Tabs`.

---

## 1 · Mapping — design screen ⇄ existing route/component

| # Design | Bundle screen comp. | Existing route file |
|---|---|---|
| 01 | `ScreenLogin` | `routes/LoginRoute.tsx` |
| 02 | `ScreenGoddessDashboard` | `routes/goddess/DashboardRoute.tsx` |
| 03 | `ScreenGoddessCharts` | idem (charts panel inside Dashboard) |
| 04 | `ScreenSubsList` | `routes/goddess/SubsListRoute.tsx` |
| 05 | `ScreenSubOverview` | `routes/goddess/subs/SubManageRoute.tsx` (overview tab) |
| 06 | `ScreenSubContracts` | `routes/goddess/subs/SubManageRoute.tsx` (contracts tab) |
| 07 | `ScreenSubKinks` | `routes/goddess/subs/SubManageRoute.tsx` (kinks tab) |
| 08 | `ScreenContractsAll` | `routes/goddess/GoddessContractsRoute.tsx` |
| 09 | `ScreenContractDetail` | `routes/ContractDetailRoute.tsx` (goddess pov) |
| 10 | `ScreenValidations` | `routes/goddess/PendingValidationsRoute.tsx` |
| 11 | `ScreenWeekly` | `routes/goddess/WeeklyPaymentsRoute.tsx` |
| 12 | `ScreenLate` | `routes/goddess/LateRoute.tsx` |
| 13 | `ScreenRituals` | `routes/goddess/GoddessRitualsRoute.tsx` |
| 14 | `ScreenPenalty` | `routes/goddess/PenaltyRulesRoute.tsx` |
| 15 | `ScreenMerits` | `routes/goddess/MeritsAdminRoute.tsx` |
| 16 | `ScreenAdminConsole` | `routes/admin/AdminRoute.tsx` |
| 17 | `ScreenAdminCron` | `routes/admin/AdminCronRoute.tsx` |
| 18 | `ScreenSubToday` | `routes/sub/TodayRoute.tsx` |
| 19 | `ScreenSubDashboard` | `routes/sub/DashboardRoute.tsx` |
| 20 | `ScreenSubOwnKinks` | `routes/profile/KinksRoute.tsx` |
| 21 | `ScreenGoddessInvite` | `routes/goddess/InviteSubRoute.tsx` |
| 22 | `ScreenGoddessInvitations` | `routes/goddess/InvitationsListRoute.tsx` |
| 23 | `ScreenGoddessMethods` | `routes/goddess/PaymentMethodsRoute.tsx` |
| 24 | `ScreenGoddessRecordPayment` | `routes/goddess/RecordPaymentRoute.tsx` |
| 25 | `ScreenGoddessBlacklist` | `routes/goddess/BlacklistRoute.tsx` |
| 26 | `ScreenGoddessKinkOverview` | `routes/goddess/KinkOverviewRoute.tsx` |
| 27 | `ScreenGoddessReviewQueue` | `routes/goddess/ReviewQueueRoute.tsx` |
| 28 | `ScreenGoddessPhotoQueue` | `routes/goddess/PhotoQueueRoute.tsx` |
| 29 | `ScreenGoddessProfileReqs` | `routes/goddess/ProfileChangeRequestsRoute.tsx` |
| 30 | `ScreenGoddessContractForm` | `routes/goddess/ContractFormRoute.tsx` |
| 31 | `ScreenGoddessSubJournal` | `routes/goddess/JournalReaderRoute.tsx` |
| 32 | `ScreenGoddessSubInventory` | `routes/goddess/InventoryRoute.tsx` |
| 33 | `ScreenSubPayments` | `routes/sub/PaymentHistoryRoute.tsx` |
| 34 | `ScreenSubDeclarePayment` | `routes/sub/PaymentFormRoute.tsx` |
| 35 | `ScreenSubContractsList` | `routes/sub/SubContractsRoute.tsx` |
| 36 | `ScreenSubProposeContract` | `routes/sub/ProposeContractRoute.tsx` |
| 37 | `ScreenSubAdjustments` | `routes/sub/PendingAdjustmentsRoute.tsx` |
| 38 | `ScreenSubJournalOwn` | `routes/sub/JournalRoute.tsx` |
| 39 | `ScreenSubLimits` | `routes/profile/LimitsRoute.tsx` |
| 40 | `ScreenSubAftercare` | `routes/profile/AftercareRoute.tsx` |
| 41 | `ScreenSubInventoryOwn` | `routes/sub/InventoryRoute.tsx` |
| 42 | `ScreenSubMedical` | `routes/profile/MedicalRoute.tsx` |
| 43 | `ScreenSubProfile` | `routes/ProfileRoute.tsx` |
| 44 | `ScreenSubContractDetail` | `routes/ContractDetailRoute.tsx` (sub pov) |
| 45 | `ScreenSubDashboardNotif` | `components/layout/NotificationBell.tsx` popover |
| 46 | `ScreenForgotPassword` | `routes/ForgotPasswordRoute.tsx` |
| 47 | `ScreenInviteLanding` | `routes/public/InviteLandingRoute.tsx` |
| 48 | `ScreenSignup` | `routes/public/SignupRoute.tsx` |
| 49 | `ScreenSignContractError` | `routes/sub/ContractSignRoute.tsx` (error branch) |
| 53 | Contract preview | `routes/goddess/ContractPreviewRoute.tsx` |
| 59 | Breach sub | `routes/goddess/BreachSubRoute.tsx` |
| 60 | Sub manage (goddess) | `routes/goddess/subs/SubManageRoute.tsx` |

Existing screens with **no direct mock** (keep logic, restyle with primitives):
- `routes/ResetPasswordRoute.tsx` → reuse login split layout
- `routes/HealthRoute.tsx` → neutral plate
- `routes/HomeRoute.tsx` → role redirect, no chrome
- `routes/NotFoundRoute.tsx` → neutral plate
- `routes/sub/LedgerRoute.tsx` → reuse sub payments treatment
- `routes/sub/PorchRoute.tsx` / `components/layout/PorchLayout.tsx` → "tribute locked" plate on cream bg

---

## 2 · Refactor steps (atomic, checkbox-tracked)

> One step = one short Sonnet session. Each step names its files. `[ ]` means
> not done. Opus checks boxes after the commit lands.

### Phase A · Foundation & primitives

- [x] **Step 1 — Wire Google Fonts.** Replace the Cormorant/Inter-Tight link in `client/index.html` with Playfair Display + Inter + IBM Plex Mono. _Files: `client/index.html`._
- [x] **Step 2 — Rewrite design tokens.** Replace the pink/violet/gold/crimson palette with the four scales (pink, lime, cream, ink) + semantic aliases; keep `[data-theme="light"]` + `html[data-theme="dark"]` branches. _Files: `client/src/styles/tokens.css`._
- [x] **Step 3 — Rewire `@theme inline`.** In `globals.css`, expose the new scales as Tailwind utilities (`bg-bg`, `bg-bg-elev`, `text-text`, `border-line`, `bg-accent`, `text-accent-deep`, `bg-signal`, `text-signal-ink`, `bg-ok-bg`, `text-ok-ink`, `bg-warn-bg`, …), drop violet/gold/debt utilities, swap fonts to `--font-serif / --font-sans / --font-mono`. Adjust page background (no radial pink+violet blobs; use `--bg` + optional hairline). _Files: `client/src/styles/globals.css`._
- [x] **Step 4 — Theme default flip.** Make `dark` the default (`<html data-theme="dark">` in `client/index.html`) and update `hooks/useTheme.ts` + `ThemeToggle.tsx` so system→dark, light is explicit. _Files: `client/index.html`, `client/src/hooks/useTheme.ts`, `client/src/components/layout/ThemeToggle.tsx`._

→ _commit: `refactor(ui): phase A foundation — tokens, fonts, theme default`_

### Phase B · Primitive components (shadcn-aligned, no hex inline)

- [x] **Step 5 — Button variants.** Rewrite `button.tsx` variants to `primary | ghost | soft | ink | danger` using `bg-accent / text-accent-ink`, `border-line-strong`, `bg-accent-trace / text-accent-deep`, `bg-ink-400`, `text-bad-ink`. Sizes `sm|md|lg|icon`, radius 6. _Files: `client/src/components/ui/button.tsx`._
- [x] **Step 6 — Badge tones.** Rewrite `badge.tsx` tones to `neutral | ok | warn | bad | pink | ink`, mono typography, radius 4, uppercase tracking. _Files: `client/src/components/ui/badge.tsx`._
- [x] **Step 7 — Card.** Drop `.luxe-surface` helper, use `bg-bg-elev border-line rounded-[10px] p-[18px]` + hairline shadow. Split `CardTitle` to serif italic. _Files: `client/src/components/ui/card.tsx`, `client/src/styles/globals.css` (remove `.luxe-surface`)._
- [x] **Step 8 — Avatar.** Pink-trace background, mono initials, hairline border; size prop. _Files: `client/src/components/ui/avatar.tsx`._
- [x] **Step 9 — Inputs & form controls.** Input/Label/Select/Switch/DatePicker → cream/ink surfaces, accent focus ring (`ring-accent` @ 2 px), radius 6. _Files: `client/src/components/ui/input.tsx`, `label.tsx`, `select.tsx`, `switch.tsx`, `date-time-picker.tsx`._
- [x] **Step 10 — Tabs.** Flat underline strip on `border-line`, active tab `text-accent-deep` + `border-accent`. _Files: `client/src/components/ui/tabs.tsx`._
- [x] **Step 11 — Dialog / Modal / SidePanel / Separator.** Backdrop `bg-ink-400/50`, modal `bg-bg-elev rounded-[10px]`, divider hairline. _Files: `client/src/components/ui/dialog.tsx`, `Modal.tsx`, `SidePanel.tsx`, `separator.tsx`._
- [x] **Step 12 — DropdownMenu, Toaster (sonner), Skeleton, EmptyState, ErrorState.** Align surfaces, hairlines, fonts. _Files: `client/src/components/ui/dropdown-menu.tsx`, `sonner.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `ErrorState.tsx`._
- [x] **Step 13 — New editorial primitives.** Add `Stat`, `Money`, `SectionTitle`, `Divider`, `Eyebrow`, `PageHeader` under `components/ui/` (named exports, no default), matching the `shell.jsx` API — serif italic numerics, mono eyebrows, hairline rules. _Files: `client/src/components/ui/stat.tsx`, `money.tsx`, `section-title.tsx`, `divider.tsx`, `eyebrow.tsx`, `page-header.tsx`._

→ _commit: `refactor(ui): phase B primitives — button/badge/card/inputs/editorial`_

### Phase C · Shell & navigation

- [ ] **Step 14 — Grouped nav items.** Rewrite `navItems.ts` to export grouped structures matching the bundle (`NAV_GODDESS` Overview/People/Money/Moderation/Rules; `NAV_SUB` Today/Money/Profile; `NAV_ADMIN` System). Add `group`, optional `badge`/`tone`. Keep existing route targets. _Files: `client/src/components/layout/navItems.ts`._
- [ ] **Step 15 — Sidebar + Topbar + AppShell.** Rebuild `AppLayout.tsx` as sidebar (232 px grouped nav, role avatar foot) + sticky topbar (crumbs + serif italic page title + search + notif bell). Remove horizontal topnav. Keep `ImpersonationBanner`/`SafewordBanner` above topbar. _Files: `client/src/components/layout/AppLayout.tsx` (extract `Sidebar.tsx`, `Topbar.tsx`, `BrandMark.tsx` siblings if >300 lines)._
- [ ] **Step 16 — Mobile nav drawer + account menu.** Adapt mobile drawer to match sidebar grouping; restyle `DropdownMenu` account popover (avatar + display name + username mono). _Files: `client/src/components/layout/AppLayout.tsx` (mobile block), `client/src/components/ui/dropdown-menu.tsx` (if tweaks needed)._
- [ ] **Step 17 — Banners + notifications chrome.** Restyle `ImpersonationBanner`, `SafewordBanner`, `NotificationBell`, `NotificationFilterChips`, `NotificationItem`, `PushOptInToggle` with new tokens. _Files: `client/src/components/layout/ImpersonationBanner.tsx`, `SafewordBanner.tsx`, `NotificationBell.tsx`, `NotificationFilterChips.tsx`, `NotificationItem.tsx`, `PushOptInToggle.tsx`._
- [ ] **Step 18 — Porch (tribute-locked) layout.** Restyle `PorchLayout`, `PorchGuard`, `PorchRoute` to match the editorial cream/ink plate ("your account awaits your first tribute"). _Files: `client/src/components/layout/PorchLayout.tsx`, `PorchGuard.tsx`, `client/src/routes/sub/PorchRoute.tsx`._

→ _commit: `refactor(ui): phase C shell — sidebar, topbar, banners, porch`_

### Phase D · Auth & public

- [ ] **Step 19 — LoginRoute.** Split-screen editorial: left hero (serif italic "Mean Mal, the Ledger"), right form on cream/ink. Reuse new primitives. _Files: `client/src/routes/LoginRoute.tsx` (and any `components/auth/*` extracted)._
- [ ] **Step 20 — Forgot / Reset password.** Reuse login layout, adjust copy. _Files: `client/src/routes/ForgotPasswordRoute.tsx`, `ResetPasswordRoute.tsx`._
- [ ] **Step 21 — Invite landing + Signup.** Public invite screen + post-invite signup, matching screens 47 & 48. _Files: `client/src/routes/public/InviteLandingRoute.tsx`, `SignupRoute.tsx`._

→ _commit: `refactor(ui): phase D auth & public — login/reset/invite/signup`_

### Phase E · Goddess · overview & money

- [ ] **Step 22 — Goddess Dashboard + charts panel.** KPIs as `Stat` cards, drained counter in serif, charts retyped w/ token colours (recharts). _Files: `client/src/routes/goddess/DashboardRoute.tsx`, any `components/dashboard/*`._
- [ ] **Step 23 — Validations queue.** Two-pane layout: list left, inspector right; `source` `Badge` (`sub_declared`/`goddess_recorded`). _Files: `client/src/routes/goddess/PendingValidationsRoute.tsx` + `components/payments/*`._
- [ ] **Step 24 — Weekly intake.** Week picker + per-sub rows + totals strip. _Files: `client/src/routes/goddess/WeeklyPaymentsRoute.tsx`._
- [ ] **Step 25 — Late — the reckoning.** Crimson-bar rows (use `--bad-*`), count chips in sidebar nav. _Files: `client/src/routes/goddess/LateRoute.tsx`._

→ _commit: `refactor(ui): phase E goddess overview & money`_

### Phase F · Goddess · subs & contracts

- [ ] **Step 26 — Subs roster.** Hairline table, mono usernames, `Money` per row. _Files: `client/src/routes/goddess/SubsListRoute.tsx`, `components/goddess/*`._
- [ ] **Step 27 — Sub dossier (Manage).** Tabs Overview/Contracts/Kinks/Journal/Inventory; restyle each tab. _Files: `client/src/routes/goddess/subs/SubManageRoute.tsx` + tab subcomponents._
- [ ] **Step 28 — Contracts · all + Contract · detail.** Shared `ContractDetailRoute` for both roles. _Files: `client/src/routes/goddess/GoddessContractsRoute.tsx`, `client/src/routes/ContractDetailRoute.tsx`._
- [ ] **Step 29 — Breach sub + Contract preview.** Cruel-tone confirmation + serif preview. _Files: `client/src/routes/goddess/BreachSubRoute.tsx`, `ContractPreviewRoute.tsx`._

→ _commit: `refactor(ui): phase F goddess subs & contracts`_

### Phase G · Goddess · rules engine

- [ ] **Step 30 — Rituals.** Editorial list + per-ritual card. _Files: `client/src/routes/goddess/GoddessRitualsRoute.tsx`._
- [ ] **Step 31 — Penalty rules.** Builder UI, condition rows. _Files: `client/src/routes/goddess/PenaltyRulesRoute.tsx`._
- [ ] **Step 32 — Rewards & punishments (Merits).** Two-column ledger. _Files: `client/src/routes/goddess/MeritsAdminRoute.tsx`._

→ _commit: `refactor(ui): phase G goddess rules engine`_

### Phase H · Goddess · gatekeeping

- [ ] **Step 33 — Invite + Invitations list.** _Files: `client/src/routes/goddess/InviteSubRoute.tsx`, `InvitationsListRoute.tsx`._
- [ ] **Step 34 — Payment methods + Record payment.** _Files: `client/src/routes/goddess/PaymentMethodsRoute.tsx`, `RecordPaymentRoute.tsx`._
- [ ] **Step 35 — Blacklist.** _Files: `client/src/routes/goddess/BlacklistRoute.tsx`._

→ _commit: `refactor(ui): phase H goddess gatekeeping`_

### Phase I · Goddess · moderation & deeper dossier

- [ ] **Step 36 — Kink overview matrix.** _Files: `client/src/routes/goddess/KinkOverviewRoute.tsx`._
- [ ] **Step 37 — Review queue + Photo queue.** _Files: `client/src/routes/goddess/ReviewQueueRoute.tsx`, `PhotoQueueRoute.tsx`._
- [ ] **Step 38 — Profile change requests + Contract form + Journal reader + Sub inventory (goddess).** _Files: `client/src/routes/goddess/ProfileChangeRequestsRoute.tsx`, `ContractFormRoute.tsx`, `JournalReaderRoute.tsx`, `InventoryRoute.tsx`._

→ _commit: `refactor(ui): phase I goddess moderation & dossier`_

### Phase J · Sub · today & dashboard & identity

- [ ] **Step 39 — Sub Today + Dashboard.** Warmer palette, serif eyebrow "Today", single-column. _Files: `client/src/routes/sub/TodayRoute.tsx`, `client/src/routes/sub/DashboardRoute.tsx`._
- [ ] **Step 40 — Sub profile (avatar & identity) + Inventory.** _Files: `client/src/routes/ProfileRoute.tsx`, `client/src/routes/sub/InventoryRoute.tsx`._
- [ ] **Step 41 — Kinks + Limits + Aftercare + Medical.** _Files: `client/src/routes/profile/KinksRoute.tsx`, `LimitsRoute.tsx`, `AftercareRoute.tsx`, `MedicalRoute.tsx`._

→ _commit: `refactor(ui): phase J sub today & identity`_

### Phase K · Sub · money & contracts

- [ ] **Step 42 — Payment history + Declare payment.** _Files: `client/src/routes/sub/PaymentHistoryRoute.tsx`, `PaymentFormRoute.tsx`._
- [ ] **Step 43 — Contracts list + Propose + Sign + error branch.** _Files: `client/src/routes/sub/SubContractsRoute.tsx`, `ProposeContractRoute.tsx`, `ContractSignRoute.tsx`._
- [ ] **Step 44 — Pending adjustments + Journal + Ledger.** _Files: `client/src/routes/sub/PendingAdjustmentsRoute.tsx`, `JournalRoute.tsx`, `LedgerRoute.tsx`._

→ _commit: `refactor(ui): phase K sub money & contracts`_

### Phase L · Admin & tail

- [ ] **Step 45 — Admin console + Cron.** _Files: `client/src/routes/admin/AdminRoute.tsx`, `AdminCronRoute.tsx`._
- [ ] **Step 46 — Shared tail routes.** `Home` redirect, `NotFound`, `Health`, `RouterErrorBoundary` neutral plates. _Files: `client/src/routes/HomeRoute.tsx`, `NotFoundRoute.tsx`, `HealthRoute.tsx`._
- [ ] **Step 47 — Confirm/Reject modals + SearchableSelect + Signature canvas.** _Files: `client/src/components/shared/ConfirmActionModal.tsx`, `RejectModal.tsx`, `SearchableSelect.tsx`, `components/signature/*`._

→ _commit: `refactor(ui): phase L admin, tail routes, shared modals`_

### Phase M · Polish, smoke, tests

- [ ] **Step 48 — Notification popover screen (45).** Match serif eyebrow + per-item rows; group "Today / Earlier". _Files: `client/src/components/layout/NotificationItem.tsx`, `NotificationBell.tsx`._
- [ ] **Step 49 — Visual regression baseline.** Run Playwright snapshots, regenerate if diffs are expected. _Files: `client/e2e/**/*.spec.ts` snapshots._
- [ ] **Step 50 — Smoke: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e`.** Fix anything that regressed on pure presentation. _Files: whatever surfaces._
- [ ] **Step 51 — Dev browser smoke.** Boot `make server` + `make client`, hit every top-level route in both themes, confirm no remaining inline hex / inline style / unmapped old utility. _Files: n/a — QA step._

→ _commit: `refactor(ui): phase M polish & smoke`_

---

## 3 · Invariants (Sonnet must respect these every step)

1. **No inline CSS** — never `style={{…}}`, `style=""`, `<style>` in components. Runtime-driven values go through CSS variables at root (precedent: `--gauge-fill-width`).
2. **No inline hex** — every colour is a Tailwind utility resolved from `tokens.css`. If a Tailwind utility is missing, add it to `@theme inline` in `globals.css` — do **not** fall back to arbitrary values with hex.
3. **No default exports** — all new components use named exports.
4. **300-line ceiling** per React component file.
5. **One-way imports** — `routes → components → services → api`. Don't break it while restyling.
6. **UUID visibility** — sub/goddess never see raw UUIDs; show `display_name` + `username`.
7. **No logic changes** — no edits to `services/`, `api/`, `hooks/` (except `useTheme` in step 4), `stores/`, `types/`, `router.tsx`, backend anywhere. If a component lifts data, it does so from existing hooks.
8. **English + GBP + Europe/London** preserved in copy.
9. **Commits** — only the diff for the current step(s). Design bundle is gitignored (`Docs/design_bundle/`, `*-handoff.tar.gz`). Conventional Commits: `refactor(ui): phase X …`.

---

## 4 · Progress ledger

Update these counters as phases close so the orchestrator can tell at a glance.

- Phases complete: **2 / 13**
- Steps complete: **13 / 51**
- Last commit: `refactor(ui): phase B — primitives`
- Next phase: **C — Shell & navigation**
