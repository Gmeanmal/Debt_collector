---
description: Scaffold a new backend route end-to-end — model, migration, dao, controller, router, and tests.
argument-hint: <entity-name> [surface-name]
---

# /new-backend-route

You are scaffolding a new backend feature for Malverse Games. Arguments: `$1` is the entity name (e.g. `tribute_entry`), `$2` is the surface folder under `Docs/app/` that owns it (e.g. `goddess`).

## Steps

1. Read `Docs/app/$2/dev-spec.md` — find the section for `$1` (models, routes, services)
2. Read `.claude/CLAUDE.md` and `Docs/app/games/dev_requirements.md` for conventions
3. Delegate to the `backend-feature` agent with a prompt containing the spec section + the layer architecture rules
4. After the agent returns, delegate to `code-reviewer` for a review pass
5. Fix any critical findings
6. Report back with:
   - Files created
   - Tests added
   - Migration filename
   - Any decisions.md impact

## What the scaffold must include

- `backend/models/$1.py` with SQLModel table + `*Create`, `*Read`, `*Update`, `*AdminView`
- Alembic migration from `uv run alembic revision --autogenerate -m "add $1 table"`, hand-reviewed
- `backend/daos/$1_dao.py` with async methods
- `backend/daos/tests/test_$1_dao.py` using polyfactory
- `backend/controllers/$1_controller.py` with business logic, raises domain exceptions
- `backend/tests/unit/controllers/test_$1_controller.py` — one test per rule branch
- `backend/routers/$1.py` with FastAPI routes + DI
- `backend/tests/integration/test_$1_routes.py` — httpx integration tests

## Never

- Never put business logic in the router
- Never mock the database
- Never use `Any`
- Never invent an answer for an OPEN decisions.md question
