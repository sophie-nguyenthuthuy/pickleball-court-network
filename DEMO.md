# Running the PCN demo locally

A minimal end-to-end demo: Postgres/PostGIS + Redis → API → web booking site
with real venues, courts, and a live 30-minute slot grid.

## Prerequisites

- Docker, Node 20+, pnpm 9+
- `pnpm install` at the repo root

## 1. Infra

```bash
docker compose up -d postgres redis
```

> Local ports are remapped by `docker-compose.override.yml`:
> Postgres `localhost:55450`, Redis `localhost:56392` (matches `.env`).

## 2. Database (schema + seed)

The committed migrations only contain the `0002` overlap/PostGIS layer, so we
push the schema directly, then apply `0002` for the geo trigger + indexes:

```bash
set -a; . ./.env; set +a
pnpm --filter @pcn/db generate
pnpm --filter @pcn/db exec prisma db push --skip-generate
docker exec -i pcn-postgres psql -U pcn -d pcn < packages/db/prisma/migrations/0002_booking_overlap_constraint/migration.sql || true
pnpm --filter @pcn/db seed
```

The two `EXCLUDE` overlap constraints in `0002` are skipped locally (Postgres
`IMMUTABLE` rule) — they are a booking-correctness guard, not needed for the demo.

Seed data: 2 venues (Thảo Điền HCMC, Cầu Giấy HN), 10 courts, weekly schedules
with off-peak (90.000đ/30min) and 17:00–21:00 peak (130.000đ/30min) pricing.

## 3. API

```bash
set -a; . ./.env; set +a
pnpm --filter @pcn/api dev   # http://localhost:4100  (Swagger at /docs)
```

> The API runs on **4100** (not the default 4000, which was taken by another
> local service). `.env` and the web client are already pointed at 4100.

## 4. Web

```bash
pnpm --filter @pcn/web dev   # http://localhost:3150
```

`NEXT_PUBLIC_API_URL=http://localhost:4100` must be set for the browser client
(it's in `apps/web/.env`; the Claude Code preview config also pins it).

## Demo flow

1. Home (`/`) — hero search + "Sân nổi bật" featured venue.
2. Listing (`/san?city=Hồ Chí Minh`) — venues by city.
3. Venue detail (`/san/thao-dien-pickleball-club`) — per-court live slot grid;
   click slots to build a booking total, then "Đặt sân".

## Notes / fixes made for the demo

- **SDK fetch bug (`packages/sdk-ts`)**: `fetch` was stored as an instance
  property and called as `this.fetchImpl(...)`, which throws
  *"Illegal invocation"* in the browser. Now wrapped in a plain function so the
  receiver stays the global. Rebuild with `pnpm --filter @pcn/sdk build`.
- **React Query offline pause**: the slot grid query is set to
  `networkMode: 'always'` so it still fetches in embedded/automated webviews
  that report `navigator.onLine === false`.
- Route folder renamed `sân/` → `san/` (Next 15 didn't match the
  diacritic URL segment); display text stays Vietnamese.
- `pino-pretty` added to `@pcn/observability` deps (dev logger needed it).
