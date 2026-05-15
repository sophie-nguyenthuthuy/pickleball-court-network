# ADR 0004 — Payment webhook verification

- Status: accepted
- Date: 2026-05-15

## Context

Three VN payment gateways (VNPay, MoMo, ZaloPay) each have their own callback contract. They all sign with HMAC over a deterministic field list, but the field set and the hash algorithm differ.

## Decision

A single `PaymentAdapter` interface in `packages/adapters/payments/types.ts` with `init()` and `verifyCallback()`. Each gateway has its own adapter file. All signature comparisons use `crypto.timingSafeEqual` to prevent timing attacks. `verifyCallback` throws `PAYMENT_SIGNATURE_INVALID` on mismatch, never returns it.

The webhook route never trusts the payload before signature verification; the only thing the route reads from the body before verifying is the signature field itself.

## Consequences

- Adding a new gateway (e.g. Sacombank IB Acquiring) is one new adapter file + an env-var slice.
- The `verifyCallback` is pure — no DB access — so it's easy to unit-test with the gateway's own sample vectors.
