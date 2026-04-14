# Project rules for all subagents

Spec: `Docs/specs.md`
History: `CHANGELOG.md`

## Orchestration workflow (main session)

The main Claude session runs on **Opus** and acts as the orchestrator. Dev work is delegated:

1. **Opus = brain.** Plans, reviews, decides. Never writes feature code directly when a subagent can do it.
2. **Dispatch Sonnet subagents for dev tasks** via the `Agent` tool (pass `model: "sonnet"`).
   - One subagent per self-contained task (one DAO, one route, one React page, one migration, etc.).
   - **Parallelise** when tasks are independent — send multiple `Agent` tool calls in a single message.
   - Each subagent prompt must be self-contained: goal, files to touch, constraints (English only, layered architecture, 300-line React cap, no inline CSS, Conventional Commits scope). Point them at `CLAUDE.md`, `server/CLAUDE.md`, `client/CLAUDE.md`.
3. **Opus verifies after every feature slice:**
   - Start/restart `make server` + `make client`, open the feature in Playwright (`mcp__plugin_playwright_playwright__*`), walk the golden path + edge cases.
   - Run `make check` (ruff + pyright strict + eslint + tsc + vite build). Fix or dispatch fix-agents until green.
   - Check `/docs` Swagger for new routes if server changed.
4. **Only Opus commits.** When CI-equivalent is green and feature works in browser, create a Conventional Commit (`feat|fix|chore|…(<scope>): …`), English, imperative, lowercase summary, no Claude co-author trailer.
5. **Update `CHANGELOG.md`** `[Unreleased]` section with notable changes before committing.

Never let a subagent commit. Never skip the Playwright + `make check` gate before committing.

## Hard rules (override all defaults)

### Testing
- No tests during phases 1–9. Tests are retrofitted in phase 10. Do NOT use TDD.

### Language & locale
- All source code, comments, commits, and file names must be in English.
- Currency: GBP (£) everywhere. Timezone: Europe/London.

### Styling
- Never inline hex colours — use Tailwind utilities generated from `tokens.css`.
- No inline CSS: no `style={{ ... }}`, no `<style>` tags, no raw `style=""` attributes.
  Exception: runtime-computed values impossible to express ahead of time — prefer CSS variables at component root over inline rules.

### Frontend components
- 300-line maximum per React component.
- Named exports only (no default exports).
- One-way imports: `components → services/hooks → api`. Never import upward.
- UUIDs are never shown to `sub` or `goddess` users. Only the `admin` role may see raw UUIDs in tables/detail pages. Display `display_name` + `username` instead.
- Payment declarations carry a `source` enum (`sub_declared` | `goddess_recorded`). Always render via a `Badge` in history/validation lists so the origin of a tribute is visible.

### Diagrams
`Docs/diagrams.html` bundles every Mermaid flow (auth, invitation, payment declaration, cron, contract state machine). Refresh it whenever a major flow changes — it is the visual companion to `Docs/specs.md`.

### Read-model endpoints
Dashboard/aggregation views that don't map to a single CRUD resource (e.g. weekly payments, late subs, 30-day planning) live under role-prefixed read-only routes (`GET /goddess/payments/weekly`, `GET /goddess/subs/late`, `GET /sub/planning`). They return pre-aggregated DTOs; no write verbs. Keep aggregation in the controller layer, never in the router.

### Comments
- Minimal comments. Well-named identifiers document themselves.
- Only comment when the WHY is non-obvious (hidden constraints, invariants, workarounds).
- If a method needs a comment block to explain its flow, split it into smaller named functions instead.

### API documentation
- Every FastAPI route must have: `summary`, `description`, explicit `response_model`, `status_code`, `tags`, and `responses={}` enumerating error cases.
- Pydantic schemas use `Field(..., description="…", examples=[…])`.
- The Swagger UI at `/docs` is the contract — treat it as first-class.

### Environment
- One `.env` per service: `server/.env` and `client/.env` are independent.
- No root-level `.env`. Each service has its own `.env.example` in its folder.

### Dependencies
- `server/pyproject.toml` (uv) and `client/package.json` (pnpm) are managed from inside their folders.
- No root `package.json`, no root `pyproject.toml`, no monorepo workspace tooling.

### Docker
- Docker hosts infra only: Postgres + Mailhog.
- Server and client always run locally (`make server`, `make client`) for hot-reload and LSP.

### Git commits
- Author = repo owner only. Never add Claude co-authorship trailers.
- Conventional Commits format: `<type>(<scope>): <summary>`
  - type: `feat|fix|chore|docs|refactor|test|ci`
  - scope: `server|client|infra|docs|db|auth|contracts|rollings|payments|admin|notif|ui`
  - Imperative mood, lowercase summary, 72-char max.
