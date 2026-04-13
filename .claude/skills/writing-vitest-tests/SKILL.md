---
name: writing-vitest-tests
description: Use when writing frontend Vitest tests — services, hooks, API wrappers, components, Zod schemas. Enforces role-based queries, renderHook usage, mocking boundaries, and naming.
---

# Writing Vitest Tests

## Stack

- **Vitest** — shares Vite config, Jest-compatible API
- **React Testing Library** — `render`, `screen`, `renderHook`
- **`@testing-library/user-event`** — user interactions
- **Zod** — schema test helpers

## Where tests live

Tests live **next to the code** they test, `.test.ts(x)` suffix:

```
src/services/auth/index.ts
src/services/auth/index.test.ts

src/utils/hooks/useAuth.ts
src/utils/hooks/useAuth.test.ts

src/components/Dashboard/main.tsx
src/components/Dashboard/main.test.tsx

src/api/goddess.ts
src/api/goddess.test.ts

src/services/validation/claims.ts
src/services/validation/claims.test.ts
```

## Mandatory coverage

- **Every file in `services/*`** — unit tests, pure logic, no React
- **Every custom hook** — `renderHook` with wrapper for Query/Jotai
- **Every `api/*.ts`** — contract test against a mocked openapi-fetch client
- **Every Zod schema** — `safeParse` happy + reject paths
- **Every component** — render + primary interaction + accessible name check

## Services (pure logic)

```ts
import { describe, it, expect } from "vitest"
import { normalizeEmail } from "./index"

describe("normalizeEmail", () => {
  it("strips plus-aliases from gmail addresses", () => {
    expect(normalizeEmail("user+alias@gmail.com")).toBe("user@gmail.com")
  })

  it("lowercases the domain", () => {
    expect(normalizeEmail("User@GMAIL.com")).toBe("user@gmail.com")
  })

  it("throws on malformed input", () => {
    expect(() => normalizeEmail("notanemail")).toThrow()
  })
})
```

## Hooks

Wrap in a provider shell that injects Query + Jotai:

```tsx
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Provider as JotaiProvider } from "jotai"

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <JotaiProvider>{children}</JotaiProvider>
    </QueryClientProvider>
  )
}

describe("useClaimQuota", () => {
  it("returns 2 of 3 when two pending claims exist", async () => {
    mockServer.use(rest.get("/goddess/quota", ...))

    const { result } = renderHook(() => useClaimQuota("g1"), { wrapper })

    await waitFor(() => expect(result.current.used).toBe(2))
    expect(result.current.max).toBe(3)
  })
})
```

## API wrappers

Mock the openapi-fetch client with a typed stub. Test URL, body, error propagation, 2xx unwrap.

```ts
import { describe, it, expect, vi } from "vitest"
import { sendClaim } from "./goddess"
import * as network from "@/services/networking"

describe("sendClaim", () => {
  it("POSTs to /goddess/claims with the sub_id", async () => {
    const post = vi.spyOn(network.client, "POST").mockResolvedValue({
      data: { id: "c1", status: "pending" },
      error: undefined,
      response: new Response(),
    })

    const result = await sendClaim({ sub_id: "s1" })

    expect(post).toHaveBeenCalledWith("/goddess/claims", { body: { sub_id: "s1" } })
    expect(result.id).toBe("c1")
  })

  it("throws when the server returns an error body", async () => {
    vi.spyOn(network.client, "POST").mockResolvedValue({
      data: undefined,
      error: { detail: "over cap" },
      response: new Response(null, { status: 409 }),
    })

    await expect(sendClaim({ sub_id: "s1" })).rejects.toThrow("over cap")
  })
})
```

## Components

Use role-based queries. `getByRole`, `getByLabelText`. Avoid `getByTestId`.

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PaymentRequestModal } from "./main"

describe("PaymentRequestModal", () => {
  it("renders the amount and the goddess name", () => {
    render(<PaymentRequestModal amountCents={5000} goddessName="Velvet" />)
    expect(screen.getByText("$50.00")).toBeInTheDocument()
    expect(screen.getByText("Velvet")).toBeInTheDocument()
  })

  it("calls onReport when the sub clicks Report sent", async () => {
    const user = userEvent.setup()
    const onReport = vi.fn()
    render(<PaymentRequestModal amountCents={5000} onReport={onReport} />)

    await user.click(screen.getByRole("button", { name: /report sent/i }))

    expect(onReport).toHaveBeenCalledTimes(1)
  })

  it("does not close on ESC", async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<PaymentRequestModal onDismiss={onDismiss} amountCents={5000} />)

    await user.keyboard("{Escape}")

    expect(onDismiss).not.toHaveBeenCalled()
  })
})
```

## Zod schemas

```ts
import { describe, it, expect } from "vitest"
import { claimCreateSchema } from "./claims"

describe("claimCreateSchema", () => {
  it("parses a valid claim", () => {
    const result = claimCreateSchema.safeParse({ sub_id: "00000000-0000-0000-0000-000000000000" })
    expect(result.success).toBe(true)
  })

  it("rejects a non-UUID sub_id", () => {
    const result = claimCreateSchema.safeParse({ sub_id: "not-a-uuid" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toEqual(["sub_id"])
  })
})
```

## What never to do

- Never use `any` in tests
- Never use `getByTestId` unless no accessible alternative exists
- Never mock `import.meta.env` directly — mock `utils/env` instead
- Never test implementation details (like "this internal hook was called") — test user-observable behavior
- Never use `setTimeout` for waits — use `waitFor` or `findBy*`
- Never skip a test with `.skip` without a TODO linking a decisions.md entry
- Never commit with a failing test
