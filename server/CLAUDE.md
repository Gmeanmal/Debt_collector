# Server — Local Rules

These rules apply inside `server/` and extend the root `CLAUDE.md`.

## Layered architecture

Imports must flow in one direction only:

```
routers → controllers → daos → models
```

- **Routers** validate HTTP concerns and delegate immediately to controllers. No business logic.
- **Controllers** orchestrate DAOs and services. No SQL, no HTTP details.
- **DAOs** own all database queries. Return domain model instances or plain types. No HTTP concerns.
- **Models** are SQLModel table definitions. No methods beyond simple computed properties.
- **Services** are stateless helpers (email, PDF, storage). Injected into controllers via FastAPI `Depends`.
- **Dependencies** expose FastAPI `Depends` callables (current user, session, settings).

Never import a router from a controller, a DAO from a router, or a model from a router directly.

## OpenAPI first

Every FastAPI route **must** have:

- `summary` — one imperative sentence
- `description` — markdown paragraph explaining behaviour, side-effects, and preconditions
- `response_model` — explicit Pydantic/SQLModel schema
- `status_code` — explicit integer
- `tags` — list with exactly one tag
- `responses={}` — dict enumerating all non-2xx status codes with descriptions

Pydantic fields use `Field(..., description="...", examples=[...])`.

The `/docs` Swagger UI is the server's contract — treat it as first-class.

## Money

Always use `Decimal` for monetary amounts. Never `float`. Store as `NUMERIC(12,2)` in Postgres.

## Timezone

All datetimes stored as UTC. Display and business rules use `Europe/London` (accounts for BST).
Import `ZoneInfo("Europe/London")` from `zoneinfo`; never hardcode UTC offsets.

## Minimal comments

Well-named identifiers document themselves. Only comment when the WHY is non-obvious
(hidden constraints, invariants, workarounds). If a function needs a block comment to
explain its flow, split it into smaller named functions instead.

## Environment

- Config lives in `server/.env` (not root `.env`).
- `get_settings()` is `lru_cache`-wrapped — call it freely, no singleton boilerplate needed.
- Never commit secrets; `.env` is in `.gitignore`.

## Package management

All package operations use `uv` from inside `server/`:

```bash
uv add <package>
uv sync
uv run <command>
```

Never use `pip` directly in this project.

## Naming

- Files and modules: `snake_case`
- Classes: `PascalCase`
- Public functions and variables: `snake_case`
- Constants: `SCREAMING_SNAKE_CASE`
- All identifiers, comments, docstrings, and commit messages: **English only**
