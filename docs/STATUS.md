# Status & roadmap

> Last reviewed: 2026-05-15

## Window

Pickleball Vietnam grew from ~30 courts in mid-2024 to ~500 by early 2026 across HCMC + HN. The booking experience today is overwhelmingly *Zalo DM to court owner*. Playtomic (global incumbent) is rumoured to start localising for VN in 2026-Q3; that gives us **12–18 months** to lock in supply (venues) and demand-side stickiness (ladder + tournaments).

## v0.1 — scaffolding (current)

- [x] Monorepo skeleton + CI
- [x] Database schema covering venues, courts, schedules, bookings, payments, ratings, ladder, tournaments, notifications, Zalo OA conversations
- [x] Postgres EXCLUDE constraint for booking overlap
- [x] Glicko-2 rating + ladder scoring
- [x] Single-elim + round-robin bracket generation
- [x] VNPay / MoMo / ZaloPay payment adapters with signature verification
- [x] Zalo OA send + webhook adapter
- [x] Fastify API surface (auth, venues, courts, bookings, payments, ladders, tournaments, webhooks, WebSocket)
- [x] Next.js web (home, search, venue detail, slot grid)
- [x] Next.js admin
- [x] Expo mobile skeleton
- [x] BullMQ worker (outbox, reminders, ratings, hold expiry)

## v0.2 — booking core GA (target: +6 weeks)

- [ ] End-to-end booking happy path against VNPay sandbox
- [ ] Owner onboarding wizard (KYB, payout account, court schedule import)
- [ ] Zalo OA booking bot — 3 intents: "tìm sân", "đặt sân", "lịch của tôi"
- [ ] Email + SMS receipts
- [ ] Refund flow (full / 50% / 20% / 0% by cancellation lead time)
- [ ] Playwright smoke + load test (200 concurrent booking attempts on the same slot → 1 success, 199 graceful 409)

## v0.3 — ladder (target: +10 weeks)

- [ ] Match submission with dual-side confirmation
- [ ] Weekly Glicko recompute job in production
- [ ] City ladders for HCMC and HN
- [ ] Skill-band auto-suggestion for new players

## v0.4 — tournaments (target: +16 weeks)

- [ ] Tournament create / publish flow for organisers
- [ ] Online registration + entry fee collection
- [ ] Bracket draw + court allocation
- [ ] Live scoring (operator UI) + public watch page

## v1.0 — production GA (target: +20 weeks)

- [ ] SLO: 99.5% API availability, p95 booking-create < 300ms
- [ ] On-call runbook + Pagerduty
- [ ] Pen-test by external firm
- [ ] Compliance review with VN payment licensing (Circular 39/2014/TT-NHNN if we ever escrow tournament prize money)

## Out of scope for v1

- Real-time partner matchmaking
- Live video streaming
- Equipment marketplace (paddles, balls)

## Open product questions

1. **Pricing power.** Owners use Zalo DM today partly because it's free. 8% platform fee may feel steep — can we offer 0% to seed-list venues for the first 12 months in exchange for exclusivity?
2. **Ladder seriousness.** DUPR is starting to land in VN (informally). Do we mirror DUPR or run our own + cross-walk? Decision blocks ladder UI copy.
3. **Padel.** ~10 padel courts in VN as of 2026-05; do we wait, or list them now to be the de-facto padel directory?
