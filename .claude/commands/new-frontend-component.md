---
description: Scaffold a new frontend component or folder with types, Zod schemas, API wrapper, query keys, tests, and a visual snapshot.
argument-hint: <component-name> [surface-name]
---

# /new-frontend-component

Arguments: `$1` is the component name in PascalCase (e.g. `WaitingPool`), `$2` is the surface folder under `Docs/app/` (e.g. `goddess`).

## Steps

1. Read `Docs/app/$2/review.html` — the visual contract
2. Read `Docs/app/$2/dev-spec.md` — the backend contract
3. Read `.claude/CLAUDE.md` and `Docs/app/games/dev_requirements.md` for conventions
4. Check `src/types/api.generated.ts` exists for the required routes; if not, run `pnpm generate:types` first
5. Delegate to the `frontend-feature` agent with the review.html excerpt + dev-spec excerpt
6. After the agent returns, delegate to `code-reviewer`
7. Fix any critical findings
8. Report back with:
   - Files created
   - Tests added
   - Whether a Playwright visual snapshot was created
   - Any decisions.md impact

## What the scaffold must include

- `src/components/$1/main.tsx` under 300 lines (split into folder if needed)
- `src/components/$1/main.test.tsx` with render + interaction + a11y
- `src/api/<domain>.ts` entry for any new API calls
- `src/api/<domain>.test.ts` contract test against mocked openapi-fetch
- `src/services/validation/<domain>.ts` Zod schemas for any form
- `src/utils/queryKeys.ts` entry
- `src/utils/hooks/use$1.ts` if the component needs non-trivial query/mutation glue
- `src/utils/hooks/use$1.test.ts` with `renderHook`
- `frontend/tests/visual/$1.spec.ts` — Playwright visual snapshot at 1440×900 + 390×844 if this is a new route

## Never

- Never use `any`
- Never default-export
- Never hand-write API types
- Never import from `api.generated.ts` directly in a component
- Never hard-code hex colors — use CSS variables from `globals.css`
- Never use `getByTestId` unless there is no accessible alternative
