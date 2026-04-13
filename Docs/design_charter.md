# Debt Collector — Design Charter

Visual & UX reference for the app. Aligned with the **Malverse Games** brand universe (same Goddess, same world). Every colour in code must come from the tokens defined here — never inline hex values.

---

## 1. Brand

| | |
|---|---|
| **Product name** | Debt Collector |
| **Owner persona** | Goddess Mean Mal |
| **Tagline** | *Obey. Pay. Repeat.* |
| **Vibe** | Dark, luxurious, financial-domination aesthetic. Serious but playful cruelty. |
| **Surfaces** | Dark and light themes both supported in v1. Default = dark. User preference persisted per account; toggle in header. |
| **Tone of voice** | Direct, possessive, never condescending toward the user (even subs). Domme energy in microcopy, formal tone on contracts/PDFs. |

---

## 2. Colour Tokens

All variables live in `frontend/src/styles/tokens.css` and are exposed as Tailwind utilities via `globals.css`.

### 2.1 Base surfaces (dark)

| Token | Hex | Use |
|-------|-----|-----|
| `--color-base-bg` | `#05020a` | Page background |
| `--color-base-surface` | `#0f0a18` | Cards, panels |
| `--color-base-surface-raised` | `#1a1226` | Modals, drawers, raised elements |
| `--color-base-border` | `#2a1e3a` | Dividers, input borders |
| `--color-base-text` | `#f4ecff` | Primary text |
| `--color-base-text-muted` | `#b8a8cf` | Secondary text |
| `--color-base-text-subtle` | `#7a6a92` | Helper text, timestamps |

### 2.2 Pink — Goddess & sub surfaces

| Token | Hex | Use |
|-------|-----|-----|
| `--color-pink-primary` | `#ff4fa3` | Primary buttons, links, Goddess accents |
| `--color-pink-primary-hover` | `#ff6fb5` | Hover state |
| `--color-pink-primary-active` | `#e6458f` | Active/pressed |
| `--color-pink-ring` | `#ff4fa355` | Focus ring |
| `--color-pink-foreground` | `#1a0510` | Text on pink background |
| `--color-pink-muted` | `#3a0f22` | Tinted backgrounds |
| `--color-pink-glow` (shadow) | `0 0 40px rgba(255, 79, 163, 0.25)` | Soft glow on CTAs |

### 2.3 Violet — Admin surface

| Token | Hex | Use |
|-------|-----|-----|
| `--color-violet-primary` | `#7c3aed` | Admin accents, secondary actions |
| `--color-violet-primary-hover` | `#8b4df0` | |
| `--color-violet-primary-active` | `#6d28d9` | |
| `--color-violet-ring` | `#7c3aed55` | |
| `--color-violet-foreground` | `#f5f3ff` | |
| `--color-violet-muted` | `#1c0f32` | |

### 2.4 Gold — Drained counters, buyouts, prestige

| Token | Hex | Use |
|-------|-----|-----|
| `--color-gold-accent` | `#f5c242` | Total drained counter, buyout CTA, achievements |
| `--color-gold-accent-hover` | `#f7cc5a` | |
| `--color-gold-foreground` | `#1a1200` | Text on gold background |
| `--color-gold-ring` | `#f5c24255` | |

### 2.5 Crimson — Debt, late, penalty, breach (NEW vs Games)

| Token | Hex | Use |
|-------|-----|-----|
| `--color-debt-primary` | `#dc2626` | Late-payment banners, penalty badges, BREACHED state |
| `--color-debt-primary-hover` | `#ef4444` | |
| `--color-debt-muted` | `#3f0a0a` | Tinted backgrounds for danger zones |
| `--color-debt-ring` | `#dc262655` | |

### 2.6 Status (semantic, same as Games)

| Token | Hex | Use |
|-------|-----|-----|
| `--color-status-danger` | `#ef4444` | Errors, destructive actions |
| `--color-status-warning` | `#f59e0b` | Warnings, pending items |
| `--color-status-success` | `#22c55e` | Validated payments, active contracts |
| `--color-status-info` | `#38bdf8` | Neutral informational |

### 2.7 Light theme overrides (base surfaces only)

Accent tokens (pink, violet, gold, crimson, status) stay identical — only base surfaces flip. Applied via `[data-theme="light"]` attribute on `<html>`.

| Token | Light value | Use |
|-------|-------------|-----|
| `--color-base-bg` | `#faf7ff` | Page background |
| `--color-base-surface` | `#ffffff` | Cards, panels |
| `--color-base-surface-raised` | `#f4eeff` | Modals, drawers |
| `--color-base-border` | `#e4dcf0` | Dividers, input borders |
| `--color-base-text` | `#1a0f24` | Primary text |
| `--color-base-text-muted` | `#5a4a70` | Secondary text |
| `--color-base-text-subtle` | `#8c7ea5` | Helper text, timestamps |

Theme selection: `system` (default) | `dark` | `light`, stored on the user record (`theme_preference`) and mirrored to `localStorage` for pre-hydration flash prevention. Toggle lives in the header next to the avatar.

### 2.8 Colour usage rules

- **Pink** = Goddess-facing UI and sub-facing actions. Buttons that advance a flow.
- **Violet** = Admin-only zones. Never appears in Goddess or sub dashboards.
- **Gold** = Money counters (total drained, buyout amounts). Never for actions.
- **Crimson** = Anything "the debt is bad news": late-payment bar, severe-penalty badge, blacklist page, BREACHED state chip.
- **Green** = Only for success confirmations (payment validated, contract signed).

---

## 3. Typography

| Role | Family | Weight | Size | Letter-spacing |
|------|--------|--------|------|---------------|
| Display (section headings) | **Orbitron** | 600 | 32 px | 2 px, uppercase |
| H1 (page title) | Inter | 700 | 28 px | -0.02em |
| H2 | Inter | 600 | 22 px | -0.01em |
| H3 | Inter | 600 | 18 px | 0 |
| Body | Inter | 400 | 14 px | 0, line-height 1.55 |
| Small / muted | Inter | 400 | 12 px | 0 |
| Numeric (counters, amounts, balances) | **JetBrains Mono** | 600 | 16–32 px (context) | 0, tabular numerals |
| Contract PDF headings | Playfair Display | 700 | 18–24 px | formal vibe |
| Contract PDF body | Source Serif Pro | 400 | 11 pt | |

**Rule:** all monetary amounts use tabular numerals (`font-variant-numeric: tabular-nums`) so columns line up.

---

## 4. Spacing Scale

Standard 4-px base grid.

| Token | Value |
|-------|-------|
| `space-0` | 0 |
| `space-1` | 4 px |
| `space-2` | 8 px |
| `space-3` | 12 px |
| `space-4` | 16 px |
| `space-5` | 20 px |
| `space-6` | 24 px |
| `space-8` | 32 px |
| `space-10` | 40 px |
| `space-12` | 48 px |
| `space-16` | 64 px |
| `space-24` | 96 px |

---

## 5. Radii

| Token | Value | Use |
|-------|-------|-----|
| `--radius-xs` | 2 px | Tight chips/tags |
| `--radius-sm` | 6 px | Inputs, small buttons |
| `--radius-md` | 10 px | Cards, panels |
| `--radius-lg` | 16 px | Modals, large cards |
| `--radius-xl` | 24 px | Hero blocks |
| `--radius-full` | 9999 px | Avatars, pill buttons |

---

## 6. Shadows

| Token | Value |
|-------|-------|
| `--shadow-card` | `0 6px 24px rgba(0, 0, 0, 0.45)` |
| `--shadow-pink-glow` | `0 0 40px rgba(255, 79, 163, 0.25)` |
| `--shadow-violet-glow` | `0 0 40px rgba(124, 58, 237, 0.25)` |
| `--shadow-gold-glow` | `0 0 40px rgba(245, 194, 66, 0.25)` |
| `--shadow-debt-glow` | `0 0 40px rgba(220, 38, 38, 0.3)` (for breach / severe alerts) |

---

## 7. Motion

| Token | Value | Use |
|-------|-------|-----|
| `--motion-duration-fast` | 120 ms | Micro-interactions (hover, focus, chip toggle) |
| `--motion-duration-normal` | 200 ms | Modals open, panels slide |
| `--motion-duration-slow` | 320 ms | Page transitions, toast enter/exit |
| `--motion-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default easing |

**Rules:**
- Respect `prefers-reduced-motion` — no decorative animations when set.
- Never animate colour transitions slower than `fast` (feels laggy).

---

## 8. Components — canonical specs

### 8.1 Buttons

- **Primary** (pink): filled, `radius-sm`, `padding: 10px 18px`, `hover: primary-hover + shadow-pink-glow`, `active: primary-active`.
- **Secondary** (ghost): transparent, `1px solid base-border`, text `base-text`, `hover: base-surface-raised`.
- **Destructive** (crimson): filled `debt-primary`, used for Mark as breached, Reject payment, Delete invite.
- **Gold CTA**: used **only** for "Buy out" button and "Drained" chips.
- **Disabled**: 40% opacity, `cursor: not-allowed`.
- **Loading**: swap label for spinner `≤ 16 px`, keep width stable.

### 8.2 Inputs

- Background `base-surface`, `1px solid base-border`, `radius-sm`, `padding: 10px 12px`, text `base-text`.
- Focus ring `pink-ring` 3 px offset 1 px.
- Error state: border `status-danger`, helper text below.
- Currency inputs: right-aligned, tabular-nums, prefixed with "£" chip.
- Percentage inputs: suffix "%" chip.

### 8.3 Cards

- Background `base-surface`, `radius-md`, `1px solid base-border`, `padding: 24px`, `shadow-card`.
- "Late" card variant: left accent bar 3 px in `debt-primary`.
- "Drained" card variant: subtle gold glow on hover.

### 8.4 Status chips (state badges)

| State | Background | Foreground |
|-------|-----------|-----------|
| `ACTIVE` / `validated` | `status-success` @ 18% | `status-success` |
| `PENDING_*` | `status-warning` @ 18% | `status-warning` |
| `REJECTED` / `CANCELLED_BY_DOM` | `base-surface-raised` | `base-text-muted` |
| `BREACHED` / `BLACKLISTED` | `debt-muted` | `debt-primary` |
| `CLOSED` / `COMPLETED` | `base-surface-raised` | `gold-accent` |

Chip: `radius-full`, `padding: 2px 10px`, font 11 px uppercase `letter-spacing: 1px`.

### 8.5 Tables (admin + lists)

- Row height 44 px, cell padding `8px 12px`.
- Alternating rows not used (too noisy on dark).
- Hover row: `bg: rgba(255, 79, 163, 0.04)`.
- Numeric columns right-aligned, tabular-nums.
- Primary sort arrow in `pink-primary`.

### 8.6 Toast notifications

- Slide from top-right, `radius-md`, `shadow-card`.
- Icon left, message center, close right.
- Colour by type: success=green accent bar, danger=crimson, info=violet, warning=amber.
- Auto-dismiss 4 s (6 s for warnings/errors, sticky for actions requiring input).

### 8.7 Dialogs / drawers

- Overlay `bg: rgba(0, 0, 0, 0.6)`, `backdrop-filter: blur(6px)`.
- Dialog centered, max-width 520 px (form) or 760 px (content-heavy).
- Drawer for per-sub detail: right-side, width 720 px, slide-in `motion-duration-normal`.

---

## 9. Iconography

- Set: **Lucide** (`lucide-react`). Same as Games, coherent line weight.
- Default size 20 px, stroke 1.5 px.
- Colour inherits from parent text.
- Key icons and their intent:
  - `crown` → Goddess
  - `collar` / `link` → sub
  - `shield` → admin
  - `coins` → tribute / rolling
  - `file-lock` → contract
  - `flame` → penalty
  - `alert-triangle` → late
  - `skull` → breach / blacklist
  - `trending-up` → drained counter
  - `bell` → notifications

---

## 10. Layout

- **Max content width**: 1280 px (Goddess dashboard), 1520 px (admin tables), 760 px (sub dashboard, narrower by design).
- Page gutter: 24 px mobile, 32 px ≥ 768 px, 48 px ≥ 1280 px.
- **Grid**: 12 columns, 24 px gutter.
- **Header**: sticky, 56 px, `base-surface` with 1 px bottom border, brand wordmark left, notification bell + avatar right.
- **Sidebar nav**: 240 px on ≥ 1024 px (Goddess dashboard); bottom-nav on mobile.

---

## 11. Imagery / illustration

- No stock photography.
- Optional hero on login page: abstract gradient blend (pink → violet → crimson), animated slow drift with `prefers-reduced-motion` fallback to static.
- Avatars: generated via **DiceBear `shapes`** (deterministic from username) when sub doesn't upload one. Goddess has a custom logo asset (TBD).

---

## 12. Accessibility

- Contrast: all text pairs ≥ **WCAG AA 4.5:1** against their background. Tested via Playwright + axe at CI time (later).
- Focus outlines visible on all interactive elements (`ring-2 ring-offset-2` equivalent).
- Keyboard-navigable everywhere; modals trap focus, Esc to close.
- All icons used as controls have `aria-label`.
- Numeric amounts have `role="status"` when they update live.

---

## 13. Voice & Microcopy

Examples — keep them short, direct, with a knowing edge:

| Context | Copy |
|---------|------|
| Dashboard empty state (Goddess) | *"No subs yet. Send your first invite and start draining."* |
| Late-payment banner (sub) | *"You are **3 days late**. You owe £200. Pay before midnight or it climbs again."* |
| Buyout button (sub) | *"Buy my freedom — £520"* |
| Breach button (Goddess, confirm modal) | *"Cut him loose and blacklist. This cannot be undone easily."* |
| Contract signature screen (sub) | *"By signing, I acknowledge I am property under the terms above."* |
| Entry tribute locked screen | *"Your account awaits your first tribute."* |

Avoid: apology-speak ("sorry", "oops"), cheerful corporate tone, emojis in UI (reserved for toasts — 1 small glyph max).

---

## 14. Do's / Don'ts

**Do**
- Use gold only for money and buyouts (prestige colour, rare).
- Use monospace numerals for all amounts.
- Show deadlines in both UK and local time.
- Confirm destructive actions (breach, delete invite) with a modal.

**Don't**
- Don't use inline hex colours — always tokens.
- Don't combine pink + violet as both primary on the same page (one is surface, one is accent).
- Don't animate total-drained counters more than once per update (distracting).
- Don't use more than 3 levels of nesting in cards (flat hierarchy looks better).

---

## 15. Assets to produce (before build)

- [ ] Brand wordmark "Debt Collector" (SVG, pink → crimson gradient)
- [ ] Favicon (crown/skull motif)
- [ ] Open Graph card (login page screenshot + wordmark)
- [ ] Login hero background (gradient or subtle illustration)
- [ ] Goddess avatar placeholder

---

End of charter.
