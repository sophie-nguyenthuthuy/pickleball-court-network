# ADR 0001 — Monorepo with pnpm + Turborepo

- Status: accepted
- Date: 2026-05-15

## Context

We have an API, two Next.js apps, a mobile app, and a worker that all share domain logic (booking, pricing, ratings). Splitting them across repos was rejected because the booking-engine contract is the most-changed thing in the system; we want a single PR to touch the schema, the engine, the API route, and the UI.

## Decision

Single pnpm workspace + Turborepo for orchestration. Workspaces under `apps/*` and `packages/*`. CI runs `turbo run lint test typecheck build` so unchanged packages are cached.

## Consequences

- We pay the cost of a fancier toolchain (pnpm overrides, Turborepo cache, single root tsconfig).
- We get atomic refactors and a single dependency graph — no `npm link` voodoo.
- Open-source `@pcn/sdk` is published from the same repo via Changesets; private packages remain `private: true`.
