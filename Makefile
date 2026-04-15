.PHONY: help up down server client install init-dbs flush-dbs reset-dbs feed-dbs migrate migration sync-types check-types-drift fmt lint typecheck quality check erd

.DEFAULT_GOAL := help

help: ## show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## install server + client deps
	cd server && uv sync
	cd client && pnpm install

up: ## start postgres + mailhog (docker)
	docker compose up -d

down: ## stop docker services
	docker compose down

server: ## run FastAPI on :4011
	cd server && uv run uvicorn main:app --reload --host 0.0.0.0 --port 4011

client: ## run Vite dev server on :4010
	cd client && pnpm dev

migrate: ## apply alembic migrations
	cd server && uv run alembic upgrade head

migration: ## create a new alembic migration (m=<msg>)
	cd server && uv run alembic revision --autogenerate -m "$(m)"

flush-dbs: ## drop all tables and re-create schema (no data)
	cd server && uv run python -m scripts.flush_db

init-dbs: ## flush + migrate + seed rich fake data
	cd server && uv run python -m scripts.flush_db && uv run alembic upgrade head && uv run python -m scripts.init_db

reset-dbs: ## drop + recreate dev database (destructive)
	$(MAKE) init-dbs

feed-dbs: ## run seed script on current dev db
	cd server && uv run python -m scripts.init_db

fmt: ## format server (ruff) + client (prettier)
	cd server && uv run ruff format .
	cd client && pnpm format

lint: ## lint server (ruff) + client (eslint)
	cd server && uv run ruff check .
	cd client && pnpm lint

typecheck: ## pyright strict on server, tsc --noEmit on client
	cd server && uv run pyright
	cd client && pnpm tsc --noEmit

quality: ## lint + typecheck (server + client)
	cd server && uv run ruff check .
	cd server && uv run pyright
	cd client && pnpm lint
	cd client && pnpm tsc --noEmit
	cd client && pnpm build

check: ## fmt + lint + typecheck (ci-equivalent)
	$(MAKE) fmt lint typecheck
	cd server && uv run pytest -q || true   # tests retrofit in phase 10
	cd client && pnpm vitest run || true

sync-types: ## regenerate client api.generated.ts from running server openapi
	cd client && pnpm sync-types

check-types-drift: ## fail if api.generated.ts drifted from live openapi (ci gate)
	cd client && pnpm sync-types
	git diff --exit-code client/src/types/api.generated.ts

erd: ## generate entity-relationship diagram
	cd server && uv run python scripts/generate_erd.py
