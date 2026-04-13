---
name: visual-regression
description: Use when building a new frontend surface, modifying an existing one, or investigating a Playwright snapshot diff. Covers the viewports, the review.html contract, and the update workflow.
---

# Visual Regression with Playwright

Malverse Games treats `Docs/app/<surface>/review.html` as the visual contract. The built app must look structurally identical to its review mockup. Playwright visual snapshots enforce this.

## What to snapshot

- **Every surface entry route** — Auth, Admin, Supreme Leader, Goddess, Sub, Notifications, Legal, Moderation
- **Every major component that has a distinct visual state** — payment request modal, age gate, claim quota bar, session room host view, session room sub view, tribute log off-platform banner, force-claim confirmation
- **Both viewports** — `1440x900` (desktop) and `390x844` (mobile)

## Folder layout

```
frontend/tests/visual/
├── auth.spec.ts
├── goddess/
│   ├── dashboard.spec.ts
│   ├── waiting-pool.spec.ts
│   └── session-launcher.spec.ts
├── sub/
│   ├── pending.spec.ts
│   └── assigned.spec.ts
├── notifications/
│   ├── bell.spec.ts
│   └── payment-modal.spec.ts
└── __snapshots__/    # committed to the repo
```

## Writing a visual test

```ts
import { test, expect } from "@playwright/test"

test.describe("Goddess dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill("goddess.test@malverse.local")
    await page.getByLabel("Password").fill("testpassword")
    await page.getByRole("button", { name: /log in/i }).click()
    await page.waitForURL("**/goddess/dashboard")
  })

  test("desktop 1440x900 @visual", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page).toHaveScreenshot("goddess-dashboard-desktop.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    })
  })

  test("mobile 390x844 @visual", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page).toHaveScreenshot("goddess-dashboard-mobile.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    })
  })
})
```

## Seeding

Visual tests run against a seeded dev database. `frontend/tests/fixtures/seed.ts` produces deterministic users/Goddesses/subs/sessions so screenshots are stable across runs. Never let a visual test depend on `new Date()`, `Math.random()`, or any live data.

If the backend has a seed CLI (`uv run python -m scripts.seed_visual`), run it in `playwright.config.ts` `globalSetup`.

## Stabilizing

Things that break snapshots silently:

- **Animations** — disable with `*, *::before, *::after { animation: none !important; transition: none !important; }` injected via `page.addStyleTag`
- **Fonts** — use `await page.waitForLoadState("networkidle")` and preload the Inter + Orbitron fonts via `<link rel="preload">`
- **Caret blink** — `caret-color: transparent` in test mode
- **Scroll position** — `await page.evaluate(() => window.scrollTo(0, 0))` before screenshot
- **Tooltips / focus rings** — blur active element before screenshot

Bundle these into a `stabilize(page)` helper and call it in every visual test.

## Updating a snapshot

Snapshot updates require a reviewer sign-off in the PR. The workflow:

1. Run `pnpm -C frontend playwright test --update-snapshots <path>` locally
2. Inspect the new snapshot visually — does it match the review.html? If not, fix the code, not the snapshot
3. Commit with a `test(visual):` prefix and a body explaining what visually changed and why
4. In the PR, link to the review.html that was updated (if any) or justify why the new look is the new contract

**Never** blanket-update snapshots to make CI green. That defeats the point.

## CI

Visual tests run in CI on every PR. The CI runner uses the same container image + font stack as local to minimize rendering drift.

If a snapshot fails in CI but passes locally, suspect:

- Different font rendering (install Inter + Orbitron in the CI image)
- Different device pixel ratio (fix `deviceScaleFactor: 1` in `playwright.config.ts`)
- Stale seed data (regenerate in `globalSetup`)

## What never to do

- Never disable a visual test to make CI green — fix the code or update the snapshot with review
- Never use `maxDiffPixelRatio > 0.05` — that hides real visual regressions
- Never let a visual test depend on real-time data
- Never commit a snapshot whose diff you have not looked at
- Never use `page.screenshot` with a cropped region to hide a failing area — screenshot the full page
