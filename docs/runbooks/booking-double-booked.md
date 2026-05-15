# Runbook — Two confirmed bookings on the same slot

> Severity: **SEV-1**. Player + owner both expect the court. Customer-service impact is high.

## Detection

1. Owner reports via Zalo OA / hotline.
2. Or: alert from `apps/worker/src/queues/reconciliation.ts` (TBD v0.2) — query joins on `Booking` looking for overlapping confirmed rows per courtId.

## Verify

```sql
SELECT b1.id AS b1, b2.id AS b2, b1."courtId", b1."startAt", b1."endAt", b2."startAt", b2."endAt"
FROM "Booking" b1
JOIN "Booking" b2
  ON b1."courtId" = b2."courtId"
 AND b1.id < b2.id
 AND tstzrange(b1."startAt", b1."endAt", '[)') && tstzrange(b2."startAt", b2."endAt", '[)')
WHERE b1.status IN ('CONFIRMED','IN_PROGRESS')
  AND b2.status IN ('CONFIRMED','IN_PROGRESS');
```

If this returns rows, the EXCLUDE constraint is broken or was disabled — investigate before doing anything else.

## Triage

1. Identify which booking came first by `confirmedAt`.
2. Reach out to the **later** booker via Zalo OA + phone. Options offered, in order:
   - Same court, adjacent time (sweetened with a 50% discount).
   - Different court at the same venue.
   - Full refund + 1 free booking credit.

## Resolve

- Cancel the chosen booking via the admin UI (or API `POST /v1/bookings/:id/cancel` with `reason="ops-resolution-double-book"`).
- Issue refund via `POST /v1/refunds` (worker handles the gateway call).
- Annotate `AuditLog` with the incident.

## Postmortem

If the EXCLUDE constraint should have prevented this:
- Was the constraint dropped or paused (e.g. during a migration)?
- Did one of the bookings come via a path that bypassed the canonical `prisma.booking.create` call?
- Add a regression test reproducing the race in `apps/api/src/routes/bookings.integration.test.ts`.
