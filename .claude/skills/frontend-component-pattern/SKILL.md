---
name: frontend-component-pattern
description: Use when writing, reviewing, or refactoring frontend components. Enforces the 300-line rule, named exports, one-way import rule, and the components→services→api flow.
---

# Frontend Component Pattern

Malverse Games uses a deliberately small React pattern. Every component is typed, named-exported, under 300 lines, and follows a strict one-way import rule.

## Stack reminders

- TypeScript 5 strict, **no `any`**
- Biome with `noDefaultExport: "error"` — named exports only
- TanStack Router v1 + TanStack Query v5 + Jotai + React Hook Form + Zod
- openapi-typescript for types, openapi-fetch for calls
- Tailwind v4 + shadcn/ui in-repo + Radix primitives + Motion (`motion/react`)
- Vitest + React Testing Library

## The 300-line rule

Any component file **under 300 lines**. If you exceed it, become a folder:

```
WaitingPool/
├── main.tsx          # < 300 lines, imports sub-components
├── ClaimQuotaBar.tsx
├── PoolList.tsx
└── PendingDrawer.tsx
```

`main.tsx` is the entry point. Sub-components live next to it. Never nest deeper than one level.

Generated files (`.generated.ts`) are exempt. Components that happen to fit in one file are a single `.tsx` file — no ceremony.

## One-way import rule

```
components → services → api
components → store
components → utils/hooks
router     → components
everything → utils/env
```

- Components never import from `src/types/api.generated.ts` directly. They import from `src/types/<domain>.ts`, which re-exports and adds frontend-only types.
- Features never import from each other. If `components/Goddess/` and `components/Sub/` both need the same piece, lift it to `components/shared/`.
- `@/` alias maps to `src/`. No relative `../../` paths.

## Named exports only

```tsx
// ✓ good
export function WaitingPool() { ... }

// ✗ bad
export default function WaitingPool() { ... }
```

Exception: structural config files (`vite.config.ts`, `biome.json`, `tailwind.config.ts`). Biome is configured to allow those paths.

## Component structure

```tsx
import { useAtom } from "jotai"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/utils/helpers"
import { queryKeys } from "@/utils/queryKeys"
import { getWaitingPool } from "@/api/goddess"
import { claimQuotaAtom } from "@/store/goddess"
import type { WaitingPoolEntry } from "@/types/goddess"

type Props = {
  goddessId: string
}

export function WaitingPool({ goddessId }: Props) {
  const [quota] = useAtom(claimQuotaAtom)
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.goddess.waitingPool(goddessId),
    queryFn: () => getWaitingPool(goddessId),
  })

  if (isLoading) return <PoolSkeleton />
  if (!data?.length) return <EmptyPool />

  return (
    <section className={cn("grid gap-3", quota.used >= 3 && "opacity-50")}>
      {data.map((entry) => (
        <PoolRow key={entry.id} entry={entry} />
      ))}
    </section>
  )
}
```

## Forms

- React Hook Form + Zod
- Zod schema in `src/services/validation/<domain>.ts`, mirrors the backend Pydantic contract
- Submit handler calls the typed API function from `src/api/`

```tsx
const form = useForm<ClaimCreate>({
  resolver: zodResolver(claimCreateSchema),
})
const onSubmit = form.handleSubmit(async (values) => {
  await sendClaim(values)
})
```

## Server state vs client state

- **Server state** (anything from the backend) → TanStack Query
- **Client state** (modals open, drafts, UI toggles) → Jotai atoms
- Never use `useState` for anything that lives beyond a single component — lift to Jotai

## Query keys

All keys live in `src/utils/queryKeys.ts`:

```ts
export const queryKeys = {
  goddess: {
    dashboard: () => ["goddess", "dashboard"] as const,
    waitingPool: (id: string) => ["goddess", "waiting-pool", id] as const,
    subs: (id: string) => ["goddess", "subs", id] as const,
  },
  // ...
} as const
```

Never inline a raw string array in `useQuery`.

## Styling

- Tailwind v4 utility classes
- `cn()` for conditional class merging (`utils/helpers.ts`)
- Design tokens as CSS variables in `globals.css`:
  - `--pink-primary` for game/findom/Goddess/Sub surfaces
  - `--violet-primary` for admin/dense-data surfaces
  - `--gold` for Supreme Leader authority accents
  - `--bg-base`, `--bg-elevated`, `--bg-overlay`, `--bg-interactive` for depth
- Never hard-code hex colors in components — reference the CSS variables

## Animation

- `motion/react` (Motion — formerly Framer Motion, MIT)
- Keep animations subtle: fade + translate, 150–250ms. Nothing bouncy except in the payment request popup where it is part of the findom pressure.

## Accessibility

- Interactive elements must have accessible names (`aria-label` or visible text)
- Use Radix primitives under shadcn for modals, dropdowns, dialogs — they handle focus trap and ESC
- Prefer role-based queries in tests (`getByRole`, `getByLabelText`)

## Never

- Never use `any`
- Never default-export
- Never read `import.meta.env` outside `utils/env.ts`
- Never hand-write API types — regenerate from `/openapi.json`
- Never import from `api.generated.ts` in a component
- Never hard-code colors
- Never exceed 300 lines
- Never use `getByTestId` unless no accessible alternative exists
