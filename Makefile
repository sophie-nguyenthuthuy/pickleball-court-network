SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help install up down logs reset api web admin worker mobile build lint test typecheck format db.migrate db.seed db.studio db.reset

help:
	@grep -E '^[a-zA-Z_.-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	pnpm install

up: ## Start local infra (postgres, redis, minio, otel)
	docker compose up -d
	@echo "Postgres on :5432  |  Redis on :6379  |  MinIO console http://localhost:9001  |  Mailhog http://localhost:8025"

down: ## Stop local infra
	docker compose down

logs: ## Tail infra logs
	docker compose logs -f

reset: ## Reset local infra (drop volumes)
	docker compose down -v

api: ## Run api app
	pnpm --filter @pcn/api dev

web: ## Run web app
	pnpm --filter @pcn/web dev

admin: ## Run admin app
	pnpm --filter @pcn/admin dev

worker: ## Run background worker
	pnpm --filter @pcn/worker dev

mobile: ## Run mobile app (Expo)
	pnpm --filter @pcn/mobile dev

build: ## Build all packages
	pnpm build

lint: ## Lint all packages
	pnpm lint

test: ## Run all tests
	pnpm test

typecheck: ## Typecheck all packages
	pnpm typecheck

format: ## Format codebase
	pnpm format

db.migrate: ## Run db migrations
	pnpm db:migrate

db.seed: ## Seed db
	pnpm db:seed

db.studio: ## Open Prisma Studio
	pnpm db:studio

db.reset: ## Drop and recreate the db
	pnpm --filter @pcn/db migrate:reset
