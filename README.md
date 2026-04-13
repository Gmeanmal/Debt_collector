# Debt Collector

Private financial-domination tracker for Goddess Mean Mal. See `Docs/` for specs, use cases, design charter, diagrams.

## Quick start

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
make install       # uv sync + pnpm install (per service)
make up            # postgres + mailhog in docker
make init-dbs      # migrate + seed realistic fake data
make server        # terminal 1
make client        # terminal 2
```

- Server: http://localhost:8000 (Swagger at `/docs`)
- Client: http://localhost:5173
- Admin UI: http://localhost:5173/admin
- Mailhog: http://localhost:8025

## Tree

- `server/` — FastAPI + SQLModel + Alembic + Postgres
- `client/` — React + Vite + Tailwind
- `Docs/` — design, use cases, diagrams, plans

See `server/CLAUDE.md` and `client/CLAUDE.md` for stack-specific rules.
