# Contributing

## Local setup

1. Install Node 20.11+ (`nvm use`) and pnpm 9+ (`corepack enable && corepack prepare pnpm@9.12.0 --activate`).
2. `pnpm install`
3. `make up` (starts postgres, redis, minio, otel collector)
4. `cp .env.example .env`
5. `pnpm db:migrate && pnpm db:seed`
6. `pnpm dev`

## Workflow

- Branch from `main` using `feat/<scope>`, `fix/<scope>`, `chore/<scope>`.
- Each PR should describe the **why**, link the relevant ADR or runbook, and include screenshots for UI changes.
- Required checks before merge: `pnpm lint`, `pnpm typecheck`, `pnpm test`. Husky runs lint-staged on commit.
- Conventional Commits are required (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`). Squash-merge.

## Code style

- TypeScript strict mode everywhere. Prefer `type` over `interface` for data shapes; use `interface` for nominal class contracts.
- No `any` without a `// reason:` comment.
- Domain logic lives in `packages/core` — apps must not contain business rules.
- Database access only via `packages/db`. No raw SQL outside that package.
- Side effects (HTTP, payments, push) go through `packages/adapters` so they can be faked in tests.

## Tests

- `pnpm test` — vitest, fast unit tests by default.
- `pnpm test:integration` — runs against a real postgres + redis via docker-compose.
- `pnpm test:e2e` — Playwright (web) and Detox (mobile) — slow, runs in CI nightly.
- Coverage target: 80% lines on `packages/core`, 60% elsewhere.

## ADRs

Architecture decisions live in [docs/adr/](docs/adr/). When proposing a non-trivial design change, open an ADR PR first and tag the reviewer set in `CODEOWNERS`.

## Releasing

- Changesets for versioning: `pnpm changeset`.
- CI publishes the public `@pcn/sdk-ts` package and tags Docker images on tag push.
