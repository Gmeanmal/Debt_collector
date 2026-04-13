---
description: Run the full lint/format/typecheck cycle on both backend and frontend, applying auto-fixes where safe. Use before staging a commit.
---

# /precommit-fix

## Steps

### Backend
```
cd backend
uv run ruff check --fix .
uv run ruff format .
uv run pyright .
```
Report any remaining pyright errors (these are not auto-fixable).

### Frontend
```
pnpm -C frontend biome check --write
pnpm -C frontend tsc --noEmit
```
Report any remaining tsc errors.

### OpenAPI drift
If `backend/routers/**` or `backend/models/**` changed since the last commit, also run `/sync-types` via the command.

### Fast tests
```
cd backend && uv run pytest backend/tests/unit -q
pnpm -C frontend vitest run --changed
```

## Post-run

If anything still fails, report the specific errors. **Do not** commit with failing hooks, do not use `--no-verify`.

## Never

- Never use `--no-verify`
- Never auto-update Playwright snapshots here — they require human review
- Never commit `api.generated.ts` drift that has downstream TypeScript errors
