# ADR 0002 — Postgres EXCLUDE constraint for booking-overlap

- Status: accepted
- Date: 2026-05-15

## Context

The single highest-stakes invariant in PCN is "no two paid bookings overlap on the same court". Application-level checks alone are insufficient under concurrent load — two requests can both see "no conflict" and both commit.

## Decision

Add a Postgres `EXCLUDE USING GIST` constraint over `(courtId, tstzrange(startAt,endAt,'[)'))` filtered to live statuses. The application also checks for overlap to return a friendly 409, but the DB is the authority. We rely on `btree_gist` and PostGIS extensions, both of which are available on every managed Postgres we'd realistically run on.

## Consequences

- We commit to PostgreSQL — no realistic path to MySQL/MariaDB later. Fine; we already need PostGIS.
- All ORM access must tolerate the constraint-violation error code (Prisma `P2010` / SQLSTATE `23P01`) and convert it to `SLOT_UNAVAILABLE`.
- The constraint is enforced via raw SQL migration; Prisma can't model EXCLUDE natively.

## Alternatives considered

- **`SELECT ... FOR UPDATE` + serializable isolation.** Works but expensive at our expected concurrency; introduces deadlock risk.
- **Redis-based distributed lock.** Adds a dependency to the critical path; consistency depends on Redis durability config.
