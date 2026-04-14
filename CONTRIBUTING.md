# Contributing

This repo is developed primarily with Claude Code (Opus orchestrator + Sonnet subagents) following the rules in `CLAUDE.md`, `server/CLAUDE.md`, and `client/CLAUDE.md`. Human contributors follow the same rules.

## Prerequisites

See `README.md` — Docker + Compose, Python 3.12 + `uv`, Node 20 + `pnpm`, GNU Make.

## Working on a change

1. Read `Docs/specs.md` and `Docs/use_cases.md` when touching a new area.
2. Branch off `main` with a descriptive name — e.g. `feat/admin-action-view`, `fix/rolling-tz-naive-bug`.
3. Implement the slice end-to-end: model → migration → dao → controller → router → schema → frontend (when applicable).
4. Run the full gate before committing:
   ```bash
   make check       # ruff + pyright strict + eslint + tsc + vite build
   make test        # backend unit + integration + frontend vitest
   ```
5. Write a Conventional Commit (see below) and open a pull request.

## Layered architecture

- Server: `routers → controllers → daos → models`. Never import backwards. Services live in `services/`, dependencies in `dependencies/`.
- Client: `components → services/hooks → api`. Named exports only. 300-line max per React component. No inline CSS; use Tailwind utilities generated from `tokens.css`.

Violations are blockers in review.

## Commit conventions

Conventional Commits only:

```
<type>(<scope>): <summary>

[optional body]
```

- `type`: `feat | fix | chore | docs | refactor | test | ci`
- `scope`: `server | client | infra | docs | db | auth | contracts | rollings | payments | admin | notif | ui`
- Imperative mood, lowercase summary, 72-char max on the summary line.
- **English only** — every comment, docstring, identifier, commit message, and doc.
- **Never** add `Co-Authored-By: Claude …` trailers. Author is the repo owner only.

## Database changes

Editing a model in `server/models/` requires a migration:

```bash
make migration m="add short description"
```

Inspect the generated file in `server/alembic/versions/` — autogenerate often drags in unrelated FK drift, strip it to keep the migration focused.

```bash
make migrate          # apply
make flush-dbs        # drop + recreate schema (no seed)
make init-dbs         # flush + migrate + reseed dev fake data
```

## API contract

FastAPI routes are the contract — `/docs` must be accurate.

Every route needs: `summary`, `description`, `response_model`, `status_code`, `tags`, `responses={}`. Pydantic fields use `Field(..., description=..., examples=[...])`.

After adding or editing a route, regenerate the client types before touching the frontend:

```bash
cd client && pnpm sync-types   # server must be running on :8000
```

Commit the updated `client/src/types/api.generated.ts` alongside the backend change.

## Tests

- Unit tests live in `server/tests/unit/` (pytest) and `client/src/**/*.test.ts` (vitest).
- Integration tests live in `server/tests/integration/` — they run against a real Postgres via `testcontainers`.
- Playwright visual regression baselines live in `client/e2e/`.
- TDD is not required for this project; tests were retrofitted in phase 10 and are additive going forward.

## Code style

- Minimal comments. Well-named identifiers document themselves. Comment only when the *why* is non-obvious.
- No backwards-compatibility shims for removed code. Delete completely when no longer needed.
- No `style={{...}}` or `<style>` tags in React. Tailwind only.
- Currency is `Decimal` on the server, never `float`. Display is GBP (£). Timezone is `Europe/London`.

## Review gates

Before opening a PR:

- `make check` green.
- `make test` green.
- Playwright walk-through if the change touches the UI (document which paths you exercised in the PR description).
- `/docs` spot-check if a route was added or modified.
- `CHANGELOG.md` `[Unreleased]` updated with notable changes.
