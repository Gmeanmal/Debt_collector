---
description: Run the full test suite (backend unit + integration + frontend unit + visual regression). Use before opening a PR.
argument-hint: [backend|frontend|visual|e2e]
---

# /test

Argument `$1` scopes the run: `backend`, `frontend`, `visual`, `e2e`, or omit for everything.

## Steps

### If `$1` is empty or `backend`:
```
cd backend && uv run pytest -q --cov=. --cov-report=term-missing
```
Report: passing count, failing count, coverage % for controllers/ and daos/.

### If `$1` is empty or `frontend`:
```
pnpm -C frontend vitest run --coverage
```
Report: passing count, failing count, coverage % for services/, api/, and utils/hooks/.

### If `$1` is empty or `visual`:
```
pnpm -C frontend playwright test frontend/tests/visual
```
Report any snapshot mismatches with a suggestion to run `pnpm -C frontend playwright test --update-snapshots` after human review.

### If `$1` is empty or `e2e`:
```
pnpm -C frontend playwright test frontend/tests/e2e
```

## Post-run

Fail loudly if:
- Any test failed
- Coverage dropped below the floor (backend: 85% controllers + daos, 70% routers; frontend: TBD in `vitest.config.ts`)
- A visual snapshot changed — do not auto-update, report the diff and wait for human confirmation

## Never

- Never update snapshots without human review
- Never commit with failing tests
- Never run `pytest --no-cov` to dodge coverage reporting
