# ADR 0005 — Zalo OA as the primary booking channel

- Status: accepted
- Date: 2026-05-15

## Context

The existing Vietnamese pickleball booking flow is *Zalo DM to the court owner*. Trying to drag every player into our own native app fights that habit; we'd rather meet them where they are.

Zalo OA (Official Account) bots are widely used in Vietnam for everything from banking notifications to e-commerce. The platform supports rich quick-reply UI, structured templates, and OAuth-based login.

## Decision

Treat Zalo OA as the first-class booking channel:

1. The Zalo OA bot is one of the **booking sources** in `BookingSource`, alongside web/mobile.
2. Inbound webhook events queue an `OutboxEvent("zalo.oa.event")` so the worker can respond with the booking flow state machine — keeping us off the synchronous request path.
3. The web app is treated as a **secondary** surface: lower-friction for first-time discovery via Google, but most repeat traffic should funnel back into Zalo OA.
4. Player profiles can be created lazily from a Zalo identity (`User.zaloUserId`); a player may book and pay without ever choosing a password.

## Consequences

- The booking flow has to be expressible as a state machine readable from quick-reply chips — no free-form forms.
- We're load-bearingly dependent on Zalo OA staying available + on token-refresh working. The worker has a dedicated token rotator job that runs every ~20 hours.
- Owner-side notifications (new booking, no-show entry) also go via Zalo OA by default.
