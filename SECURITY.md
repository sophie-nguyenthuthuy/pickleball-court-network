# Security policy

## Reporting a vulnerability

Email **security@pcn.vn** with:

- a description of the issue and where you found it,
- reproduction steps (and a minimal proof-of-concept if possible),
- the affected version / commit SHA,
- your contact info so we can follow up.

Please **do not** open a public GitHub issue for security problems. We aim to acknowledge reports within **48 hours** and ship a fix or mitigation within **7 days** for critical issues.

## Supported versions

Only the latest release on `main` receives security patches. The `0.x` line is pre-GA; production deployments should track the most recent tagged release.

## Scope

In scope:
- the `apps/*` and `packages/*` source in this repo,
- the public API surface,
- payment-handling logic, webhook signature verification, auth/session handling,
- the Zalo OA bot integration.

Out of scope (please report directly to the provider):
- vulnerabilities in third-party services (VNPay, MoMo, ZaloPay, Zalo OA, eSMS),
- denial-of-service via brute-force at the network edge,
- social engineering of court owners or players.

## Hardening notes

- All financial mutations require an **idempotency key** and pass through the booking state machine in `packages/core/src/booking`.
- All gateway callbacks (VNPay IPN, MoMo IPN, ZaloPay callback) **verify HMAC signatures** before mutating state. See [docs/adr/0004-payment-webhook-verification.md](docs/adr/0004-payment-webhook-verification.md).
- Player phone numbers are stored as `(hash, last4)`; full numbers are encrypted via `pgcrypto`.
- JWT secrets rotate via env; refresh tokens are stored hashed in `refresh_token` with per-device fingerprints.
