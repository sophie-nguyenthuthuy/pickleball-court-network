# Architecture

## Goals

1. **Ship a credible booking core in ~6 weeks** so we can sign 30–50 venues before Playtomic localises.
2. **Be Zalo-first**: a player should be able to discover, hold a slot, and pay without ever leaving Zalo. The web app is a fallback / SEO surface, not the primary channel.
3. **Be honest about ratings**: amateur Vietnamese pickleball is fragmented; a credible ladder + rating is what creates lock-in once Playtomic shows up. Rating is Glicko-2 (handles inactivity + uncertainty better than ELO).
4. **Treat money as money**: bookings produce real VND, the DB is the source of truth, payments are signature-verified at the edge, and every state change is auditable.

## Topology

- **apps/api** (Fastify, Node 20): the single REST + WebSocket gateway. Stateless; runs 3+ replicas behind an L7 load balancer. Holds no business rules — those live in `packages/core`.
- **apps/web** (Next.js 15 App Router): public site. Renders SEO-critical pages (venue, search results) at the edge via RSC. Calls the API for everything dynamic.
- **apps/admin** (Next.js 15): authenticated owner-and-ops dashboard. Separate deploy + subdomain so we can lock down by IP if needed.
- **apps/mobile** (Expo): single binary for iOS + Android. Uses the same SDK as web/admin.
- **apps/worker** (BullMQ on Redis): the only thing allowed to send external side effects (Zalo OA messages, SMS, push, payouts). Reads from the **outbox table** so DB writes and side effects stay in lock-step.

## Datastores

| Store      | Purpose                                                | Notes                                                                       |
| ---------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| Postgres   | source of truth; bookings, users, payments, ratings    | PostGIS for venue proximity; `btree_gist` for booking-overlap EXCLUDE       |
| Redis      | rate limits, BullMQ queues, pub/sub for WebSockets     | not used as a primary store                                                 |
| Object S3  | venue/review photos                                    | Cloudflare R2 in prod, MinIO in dev                                         |

### Booking-overlap invariant

The single most important invariant in the system: **no two CONFIRMED-or-PENDING bookings on the same court may overlap in time**.

We enforce it at the DB layer with a Postgres `EXCLUDE` constraint over `tstzrange`:

```sql
ALTER TABLE "Booking" ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING GIST (
    "courtId" WITH =,
    tstzrange("startAt","endAt",'[)') WITH &&
  ) WHERE (status IN ('PENDING_PAYMENT','CONFIRMED','IN_PROGRESS'));
```

The API also checks for conflicts in `packages/core/booking.engine.ts` to give a clean 409 before hitting the DB; the EXCLUDE is the belt-and-braces guarantee under load.

## Payment flow

```
client ──► POST /v1/payments/init
              │
              ▼
       PaymentAdapter.init      (signs, hits gateway)
              │
              ▼
       redirect to gateway
              │
              ▼
   user pays at VNPay / MoMo / ZaloPay
              │
              ├── return URL (UX-only)
              │
              ▼
   gateway IPN ──► POST /webhooks/{vnpay|momo|zalopay}
                      │
                      ▼
             verify signature (HMAC, const-time)
                      │
                      ▼
             tx: Booking → CONFIRMED, Payment → CAPTURED
                      │
                      ▼
             OutboxEvent("booking.confirmed")
                      │
                      ▼
             worker → Zalo OA confirmation message
```

We trust **only the IPN** for state changes. The return URL only updates UX; if a user closes their browser, the booking still confirms via IPN.

## Auth

- **Phone OTP** (eSMS / Zalo ZNS) → JWT access + opaque refresh.
- **Zalo Login OAuth** for users coming from the Zalo OA bot; produces the same JWT pair.
- Refresh tokens are stored hashed (Argon2id) with a per-device fingerprint. Rotation on use; previous-token-reuse triggers full session revocation.

## Why Glicko-2 over ELO

Amateur pickleball is sporadic — a club player might enter 3 matches one weekend, then nothing for a month. ELO assumes equal certainty about everyone, which makes ratings noisy and discourages newcomers (one bad match against a strong player nukes them). Glicko-2 tracks rating *deviation* (RD) and *volatility* (σ) per player; new and inactive players have wider RD, so swings are larger when there's information to be gained and smaller when there isn't. It's the system Pickleball.com, DUPR (more or less) and chess.com all use.

We map ratings onto the DUPR 2.0–7.0 band for display (`packages/core/rating/glicko2.ts`) so players can self-identify against a familiar scale.

## What we deliberately don't build (yet)

- **Real-time match-making.** Players want to *find* a court, not be matched with a partner. Matchmaking is a v0.4 feature once we have density.
- **In-app video / streaming.** Tournaments at this scale don't need it; YouTube embed is fine.
- **Crypto / blockchain anything.** Not a fit; adds compliance burden.

See [docs/STATUS.md](STATUS.md) for the roadmap.
