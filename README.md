<h1 align="center">Debt Collector</h1>

<p align="center">
  Payment and debt tracker for findom-style relationships — invitations, tributes, rollings and debt contracts in one self-hosted app.
</p>

<p align="center">
  <img alt="python" src="https://img.shields.io/badge/python-3.12+-3776ab?logo=python&logoColor=white">
  <img alt="fastapi" src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white">
  <img alt="react" src="https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=000">
  <img alt="tailwind" src="https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-ec4899">
</p>

<p align="center">
  <img src="docs/screenshots/login.png" alt="Login" width="48%">
  <img src="docs/screenshots/dashboard.png" alt="Goddess dashboard" width="48%">
</p>


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

---

## Local install

### Prerequisites

- **Docker** + Docker Compose (Postgres + Mailhog)
- **Python 3.12+** with [`uv`](https://docs.astral.sh/uv/) (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **Node 20+** with [`pnpm`](https://pnpm.io/) (`npm i -g pnpm`)
- **GNU Make**

### One-time setup

```bash
git clone <this-repo> debt-collector
cd debt-collector

# 1. Copy env templates (do not commit the resulting .env files)
cp server/.env.example server/.env
cp client/.env.example client/.env

# 2. Install deps
make install         # uv sync (server) + pnpm install (client)

# 3. Start infra (Postgres on :5432, Mailhog on :1025/:8025)
make up

# 4. Migrate + seed fake data (11 subs covering every state)
make init-dbs
```

### Run

Two terminals (both hot-reload):

```bash
# terminal 1 — FastAPI on :8000
make server

# terminal 2 — Vite on :5173
make client
```

Open:

| URL                              | What                                    |
| -------------------------------- | --------------------------------------- |
| http://localhost:5173            | Web app                                 |
| http://localhost:8000/docs       | Swagger UI (full API contract)          |
| http://localhost:8025            | Mailhog inbox (catches all dev emails)  |

### Default credentials (from `server/.env.example`)

| Role     | Email                  | Password           |
| -------- | ---------------------- | ------------------ |
| Admin    | `admin+dev@debt-collector.uk`   | `177@tTr$EbgA2CvMr@&4FM#DYaq6`   |
| Goddess  | `meanmal@debt-collector.uk`     | `!Z#9by05NEnHsi*m%Q&8XKS$d2$%`   |

`make init-dbs` also seeds 11 subs (`alex`, `ben`, `chris`, `dan`, `eli`, `fred`, `gary`, `henry`, `ian`, `jack`, `kev`) covering the full state matrix: pending entry tribute, active tributes, rolling, debt contracts, pending validations, pending adjustments, breach, blacklist, buyout. All sub passwords: `ChangeMe!Dev123`.

---

## How to use

### Goddess flow (default after login as `meanmal@debt-collector.uk`)

1. **Dashboard** (`/goddess/dashboard`) — tonight's reckoning: subs total, rolling, contracts, pending validations, total drained, late payments.
2. **Invite a sub** — header → *New invitation*. Sets entry tribute amount + expiry. Copy the generated link or wait for the email in Mailhog.
3. **Validate declared payments** (`/goddess/validations`) — subs declare payments off-platform; you confirm/recategorise/reject.
4. **Record a payment** (`/goddess/payments/record`) — log a payment yourself when you already know it landed.
5. **Manage contracts** — create debt contracts per sub, propose adjustments, sign-off on amendments.
6. **Blacklist** — kick subs that breach.
7. **Payment methods** — configure accepted methods (bank, crypto, gift cards, …).

### Sub flow

1. **Sign up** via the tokenised invite link.
2. **Pay entry tribute** → unlocks the rest of the app.
3. **Declare payments** sent off-platform → wait for goddess validation.
4. **View contracts**, sign new ones, request adjustments.

### Theme

Topbar toggle (System / Dark / Light) — pink barbie dom on deep violet-black or soft rose paper. Persisted in localStorage.

---

## Layout

```
server/    FastAPI app — routers / controllers / daos / models
client/    React app — components / hooks / services / api
Docs/      spec, use cases, diagrams, phased plan
Makefile   single entry point for every dev command
```

Stack-specific rules in `server/CLAUDE.md` and `client/CLAUDE.md`.

## Dev scripts

```bash
make help                  # list every target
make check                 # ruff + pyright + eslint + tsc + vite build (CI-equivalent)
make fmt                   # ruff format + prettier
make migration m="add x"   # autogenerate alembic revision from models
make migrate               # apply pending migrations
make flush-dbs             # drop + recreate schema (no seed)
make init-dbs              # flush + migrate + reseed fake data
make down                  # stop docker infra
```

After modifying SQLModel models always run `make migration m="…"`, inspect the generated revision in `server/alembic/versions/`, then `make migrate`.

After adding/editing routes regenerate the client types: `cd client && pnpm sync-types` (server must be running).

## Deploy

See [`DEPLOY.md`](./DEPLOY.md) for the Hetzner playbook.

## License

MIT
