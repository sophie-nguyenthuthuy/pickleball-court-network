# Pickleball Court Network (PCN)

> Booking + amateur ladder + tournament platform for pickleball and padel courts in Vietnam.

The Vietnamese pickleball market is exploding — roughly 500 new courts opened across Hanoi and HCMC between 2024 and 2026, but the dominant booking flow is still a player sending a Zalo DM to the court owner. PCN replaces that with a structured availability + real-time booking + ladder + tournament platform, with **Zalo OA chatbot integration** as the primary booking channel so we meet players where they already are.

We have a **12–18 month window** before Playtomic (the global incumbent) localizes for Vietnam. This repo is built to ship the booking core in weeks, then layer ladder + tournament before the incumbent lands.

---

## Status

- Phase: `0.x` — scaffolding & core booking engine
- See [docs/STATUS.md](docs/STATUS.md) for the current roadmap and milestone state.

## Architecture at a glance

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Channels                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────┐  │
│  │ web      │  │ mobile   │  │ Zalo OA bot  │  │ owner app  │  │ admin    │  │
│  │ (Next.js)│  │ (Expo)   │  │ (chatbot)    │  │ (PWA)      │  │ (Next)   │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └─────┬──────┘  └────┬─────┘  │
└───────┼─────────────┼───────────────┼────────────────┼──────────────┼────────┘
        │             │               │                │              │
        └─────────────┴───────────────┼────────────────┴──────────────┘
                                      ▼
                          ┌─────────────────────────┐
                          │   apps/api (Fastify)    │
                          │   - REST + WebSocket    │
                          │   - JWT + Zalo OAuth    │
                          │   - rate limit + RBAC   │
                          └────────────┬────────────┘
                                       │
        ┌──────────────────────────────┼─────────────────────────────┐
        ▼                              ▼                             ▼
┌───────────────┐            ┌─────────────────┐           ┌──────────────────┐
│ packages/core │            │ packages/db     │           │ packages/adapters│
│ booking engine│            │ Prisma + PostGIS│           │ VNPay / MoMo /   │
│ ELO ladder    │            │                 │           │ ZaloPay / Zalo OA│
│ tournaments   │            └─────────────────┘           │ eSMS / Expo push │
└───────────────┘                                          └──────────────────┘
                                       │
                                       ▼
                          ┌─────────────────────────┐
                          │   apps/worker (BullMQ)  │
                          │   - reminders           │
                          │   - rating recompute    │
                          │   - settlement / payout │
                          │   - Zalo OA broadcast   │
                          └─────────────────────────┘
```

Full diagram and rationale: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Repo layout

```
apps/
  api/         REST + WebSocket gateway (Fastify, Node 20)
  web/         Public booking site (Next.js 15, App Router)
  admin/       Court-owner + platform-ops dashboard (Next.js)
  mobile/      Player app (Expo / React Native)
  worker/      Background jobs (BullMQ on Redis)
packages/
  core/        Domain logic: booking engine, ELO, ladder, brackets
  db/          Prisma schema, migrations, seed
  adapters/    External integrations (payments, Zalo OA, SMS, push, S3)
  config/      Shared eslint / prettier / tsconfig presets
  observability/ OTel + Pino logger
  notifications/ Notification orchestration (templated)
  testing/     Test factories, fixtures, helpers
  sdk-ts/      Public TypeScript SDK (for partners)
  ui/          Shared React components (web + admin)
docs/
  ARCHITECTURE.md, SECURITY.md, STATUS.md, adr/, api/, runbooks/
infra/
  docker/, k8s/, helm/, terraform/
```

## Quickstart

Requires: **Node 20.11+**, **pnpm 9+**, **Docker**, optionally **Bun** for the mobile workspace.

```bash
# 1. install
pnpm install

# 2. start local infra (postgres + redis + minio + otel)
make up

# 3. configure env
cp .env.example .env

# 4. init db
pnpm db:migrate
pnpm db:seed

# 5. run everything
make api    # http://localhost:4000
make web    # http://localhost:3000
make admin  # http://localhost:3001
make worker
```

Smoke test: open <http://localhost:3000>, search "Cầu Giấy, Hà Nội", pick a court, complete a sandbox VNPay booking.

## Key product surfaces

| Surface | Audience | Why it matters |
| --- | --- | --- |
| **Web booking** | Players | Lowest-friction discovery + booking, indexed by Google for "sân pickleball quận X" SEO |
| **Mobile app** | Frequent players | Push reminders, mid-game score entry, ladder rank |
| **Zalo OA bot** | All players | Booking inside Zalo — the channel they already use to message the owner |
| **Owner dashboard** | Court owners | Replaces the spreadsheet — schedule grid, revenue, payouts |
| **Ladder** | Competitive amateurs | DUPR-style rating + weekly leaderboards by city/district |
| **Tournaments** | Clubs / sponsors | Draws, brackets, live scoring; eventual prize-money escrow |

## Stack

- **Backend:** Node 20, Fastify, Prisma, PostgreSQL 16 + PostGIS, Redis 7, BullMQ
- **Frontend:** Next.js 15 (App Router, RSC), TanStack Query, Tailwind, Radix UI
- **Mobile:** Expo SDK 51, React Native 0.74, Expo Router
- **Auth:** JWT (access/refresh) + Zalo Login OAuth + phone OTP via eSMS
- **Payments:** VNPay, MoMo, ZaloPay (cards & QR), VietQR for owner payouts
- **Realtime:** WebSocket (Fastify) for slot-locking and live scoring
- **Observability:** OpenTelemetry → tempo/loki/prom stack, Sentry for errors
- **Infra:** Docker, Kubernetes (Helm), Terraform for managed services

## Security & compliance

- PII at rest encrypted via Postgres pgcrypto; phone numbers stored hashed + last-4 visible.
- Payment callbacks signature-verified per gateway; idempotency keys on all financial mutations.
- Data residency: deployable to VN-resident hosts (Viettel IDC / VNG Cloud).
- See [docs/SECURITY.md](docs/SECURITY.md) and [SECURITY.md](SECURITY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Run `make lint test typecheck` before pushing.

## License

Apache 2.0 — see [LICENSE](LICENSE).
