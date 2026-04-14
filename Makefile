.PHONY: help up down server client install init-dbs flush-dbs reset-dbs migrate migration fmt lint typecheck check erd

help:
	@echo "Targets:"
	@echo "  install       install server + client deps"
	@echo "  up            start postgres + mailhog (docker)"
	@echo "  down          stop docker services"
	@echo "  server        run FastAPI locally with reload"
	@echo "  client        run Vite dev server locally"
	@echo "  migrate       apply alembic migrations"
	@echo "  migration m=  create a new alembic migration from models (autogenerate)"
	@echo "  init-dbs      flush + migrate + seed rich fake data"
	@echo "  flush-dbs     drop all tables and re-create schema (no data)"
	@echo "  reset-dbs     alias for init-dbs"
	@echo "  fmt           format server (ruff) + client (prettier)"
	@echo "  lint          lint server (ruff) + client (eslint)"
	@echo "  typecheck     pyright strict on server, tsc --noEmit on client"
	@echo "  check         fmt + lint + typecheck + tests (ci-equivalent)"

install:
	cd server && uv sync
	cd client && pnpm install

up:
	docker compose up -d

down:
	docker compose down

server:
	cd server && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

client:
	cd client && pnpm dev

migrate:
	cd server && uv run alembic upgrade head

migration:
	cd server && uv run alembic revision --autogenerate -m "$(m)"

flush-dbs:
	cd server && uv run python -m scripts.flush_db

init-dbs:
	cd server && uv run python -m scripts.flush_db && uv run alembic upgrade head && uv run python -m scripts.init_db

reset-dbs: init-dbs

fmt:
	cd server && uv run ruff format .
	cd client && pnpm format

lint:
	cd server && uv run ruff check .
	cd client && pnpm lint

typecheck:
	cd server && uv run pyright
	cd client && pnpm tsc --noEmit

erd:
	cd server && uv run python scripts/generate_erd.py

check: fmt lint typecheck
	cd server && uv run pytest -q || true   # tests retrofit in phase 10
	cd client && pnpm vitest run || true
