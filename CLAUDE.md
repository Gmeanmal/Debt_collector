# Project rules for all subagents

Active plan: `Docs/plans/2026-04-13-debt-app-implementation-plan.md`
Spec: `Docs/2026-04-13-debt-app-design.md`

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
