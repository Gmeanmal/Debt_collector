# Visual regression (Playwright)

Snapshot-based visual regression for login, dashboards, contract list, admin, blacklist. One Chromium desktop project (1280×800).

## First-time setup

```bash
pnpm --prefix client exec playwright install chromium
```

## Capture baselines

Requires postgres + server + client + seed all running:

```bash
make up
cd server && uv run alembic upgrade head && uv run python -m seeds.bootstrap
make server     # terminal 1
make client     # terminal 2
cd client && pnpm test:e2e:update
```

Baselines land under `client/e2e/visual.spec.ts-snapshots/` — commit them.

## Run against existing baselines

```bash
cd client && pnpm test:e2e
```

Failures write diff PNGs to `client/test-results/`.

## Overrides

- `E2E_BASE_URL` — defaults to `http://localhost:5173`.
- `E2E_GODDESS_EMAIL` / `E2E_GODDESS_PASSWORD` — default to bootstrap seeds.
- `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` — default to bootstrap seeds.

## Why no `webServer` in config

Seed + migration must run before the server boots with fresh DB state; coupling the lifecycle to Playwright makes diagnosing failures harder. Run stack manually (or via `make`), point Playwright at it.

## Adding a new snapshot

1. Add a `test(...)` block to `visual.spec.ts` with a unique `toHaveScreenshot` name.
2. Run `pnpm test:e2e:update` to generate the baseline.
3. Visually verify the PNG, commit it.
