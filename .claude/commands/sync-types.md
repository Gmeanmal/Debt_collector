---
description: Regenerate `src/types/api.generated.ts` from the running backend's /openapi.json and fail loud on drift.
---

# /sync-types

## Steps

1. Check that the backend is running locally (`http://localhost:4011/openapi.json` reachable). If not, start it:
   ```
   cd backend && uv run uvicorn main:app --reload --port 4011 &
   ```
   Wait until the port responds.
2. Run the generator:
   ```
   pnpm -C frontend generate:types
   ```
   (Which runs `openapi-typescript http://localhost:4011/openapi.json -o src/types/api.generated.ts`.)
3. Run `git diff --exit-code frontend/src/types/api.generated.ts`:
   - If no diff: report "types already in sync"
   - If diff: report that types drifted, show the diff summary, and stage the file. Note which routes changed so the user can decide whether the drift is intended.
4. If drift is intended, also re-run:
   ```
   pnpm -C frontend tsc --noEmit
   ```
   to surface any downstream TypeScript breakage from the regen.

## Never

- Never hand-edit `api.generated.ts`
- Never commit type drift without updating the consumers (`src/types/<domain>.ts` re-exports, components, api wrappers)
