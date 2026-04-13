# Debt Collector

Payment and debt tracker for findom-style relationships: a goddess onboards subs via invitation, records tributes, validates declared payments, and tracks rollings and debt contracts over time.

## What it is

Self-hosted web app with three roles — **admin**, **goddess**, **sub**.

- Goddess invites a sub with a fixed **entry tribute**; sub signs up via tokenised link.
- Sub **declares** payments sent off-platform (bank, crypto, gift cards, etc.); goddess **validates**, recategorises, or rejects.
- Categories: entry, tribute, rolling, weekly debt, debt payment, buyout.
- Payment methods are configurable per goddess.

Currency: GBP (£). Timezone: Europe/London. Single goddess per deployment.

## Stack

- **Server** — FastAPI, SQLModel, Alembic, Postgres, Argon2 + JWT, Resend
- **Client** — React 18, Vite, Tailwind 4, TanStack Query, react-router v7, openapi-fetch
- **Infra** — Docker hosts Postgres + Mailhog only; server and client run locally for hot-reload
- **Tooling** — `uv`, `pnpm`, `ruff`, `pyright` strict, `eslint`, `tsc`

## Quick start

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
make install       # uv sync + pnpm install
make up            # docker: postgres + mailhog
make init-dbs      # migrate + seed fake data
make server        # terminal 1
make client        # terminal 2
```

- Client: http://localhost:5173
- Server: http://localhost:8000 (Swagger at `/docs`)
- Mailhog: http://localhost:8025

## Layout

```
server/    FastAPI app — routers / controllers / daos / models
client/    React app — components / hooks / services / api
infra/     docker-compose (postgres + mailhog)
Docs/      spec, use cases, diagrams, phased plan
```

Stack-specific rules in `server/CLAUDE.md` and `client/CLAUDE.md`.

## Dev scripts

```bash
make check         # ruff + pyright + eslint + tsc + vite build
make fmt           # ruff format + prettier
make migrate m="…" # new alembic revision
make migrate-up    # apply migrations
```

## License

MIT
