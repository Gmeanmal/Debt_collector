# client/CLAUDE.md — React app rules

These rules apply to every file under `client/`. They supplement the root `CLAUDE.md` and cannot be loosened.

## Stack

- React 18, TypeScript strict, Vite 5, Tailwind 4 (CSS-first, no config file).
- State: TanStack Query for server state, Zustand for local UI state.
- Routing: react-router-dom v7 (`createBrowserRouter`).
- API: openapi-fetch typed against `src/types/api.generated.ts` (run `pnpm sync-types` to regenerate).
- Forms: plain React + Zod validation (no form library until complexity demands it).
- Env: all env vars must be prefixed `VITE_`. Read from `import.meta.env`.

## Folder structure

```
src/
  api/          openapi-fetch client + per-resource wrappers
  components/
    ui/         design-system primitives (Button, Card, Badge …)
  hooks/        custom React hooks (useAuth, useTheme …)
  routes/       one file per page route, named export matching the file name
  services/     business logic that is not a hook (pure functions, formatters)
  stores/       Zustand stores
  styles/       globals.css + tokens.css only
  types/        api.generated.ts (generated) + hand-written shared types
  router.tsx
  main.tsx
  App.tsx
```

## Import rules (one-way, no cycles)

```
routes → components → hooks → services → api
routes → hooks → services → api
stores ← hooks (stores do NOT import components or routes)
```

No circular imports. No importing from a higher layer.

## Component rules

- Max 300 lines per file. If longer, split into smaller named components.
- Named exports only — no default export (except `App` for framework compat).
- One component per file unless the sub-component is trivially small and never reused.
- Props typed with a local `interface`, not inline object types.

## UUID visibility

UUIDs are never rendered for `sub` or `goddess` users. Only `admin` may see raw IDs in tables or detail panes. For non-admin roles, display `display_name` + `username`, keep the UUID in the URL/query key only.

## Colour and styling rules

- **No inline CSS.** Never `style={{ ... }}`, `style=""`, or `<style>` tags.
- **No inline hex values.** All colours come from CSS custom properties defined in `tokens.css`.
- Use Tailwind utility classes generated from `globals.css` `@theme inline` block: `bg-base-surface`, `text-pink-primary`, `border-base-border`, etc.
- For values that are physically impossible to express ahead of time (e.g. a runtime progress width), set a CSS variable at the component root with a `className`; never an inline rule.
- Responsive variants: mobile-first. Use `sm:`, `md:`, `lg:` prefixes.

## Comment rules

- Minimal comments. Well-named identifiers document themselves.
- Only comment when the WHY is non-obvious (invariant, workaround, hidden constraint).
- No JSDoc blocks on simple components — the type signature is the documentation.
- If a function needs a comment to explain its flow, split it into smaller functions.

## TypeScript rules

- Strict mode on. No `any`. Use `unknown` + type guards instead.
- No type assertions (`as`) unless wrapping a third-party boundary with no other escape hatch — justify with a comment.
- Zod schemas live in the same file as the component or service that owns them. Shared schemas go in `src/types/`.
- Generated types in `api.generated.ts` must not be edited manually. Re-run `pnpm sync-types`.

## Env vars

- Prefix: `VITE_`. Vite strips the prefix; only `VITE_*` is exposed to the browser bundle.
- Access via `import.meta.env.VITE_*`.
- Defaults for development live in `.env.example`; actual values in `.env` (gitignored).
- Never hard-code `localhost:8000` outside of a fallback — always read `import.meta.env.VITE_API_BASE_URL`.

## Data fetching

- All server state via TanStack Query. Keys as `[resource, id?]` tuples.
- Mutations invalidate relevant query keys on success.
- Error boundaries per route segment.
- Loading states: skeletons or `...` spinners, never blocking full-page spinners except on initial auth check.

## Accessibility

- All interactive elements keyboard-navigable.
- All icon-only controls have `aria-label`.
- Live numeric amounts: `role="status"`.
- Modals trap focus; Esc closes.
- Tailwind `ring-2 ring-offset-2` equivalent on focus-visible.

## Scripts

```bash
pnpm dev          # Vite dev server on :5173
pnpm build        # TypeScript compile + Vite build
pnpm lint         # ESLint
pnpm format       # Prettier write
pnpm sync-types   # Regenerate src/types/api.generated.ts from running server
pnpm tsc --noEmit # Type-check only (no emit)
```

Run `pnpm tsc --noEmit` and `pnpm lint` before every commit.
