# Security model

> If you've found a vulnerability, see [/SECURITY.md](../SECURITY.md) for disclosure.

## Threat model

| # | Threat                                                                              | Mitigation                                                                                                                                          |
| - | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | An attacker forges a payment IPN to confirm a booking they didn't pay for           | All gateway callbacks are HMAC-verified with constant-time compare in `packages/adapters/payments/*`. Unverified callbacks raise `PAYMENT_SIGNATURE_INVALID`. |
| 2 | A race condition double-books the same court                                        | Postgres EXCLUDE constraint on `tstzrange(startAt,endAt)` partial-indexed by status. App also does an in-memory check first.                        |
| 3 | An attacker scrapes phone numbers for spam / fraud                                  | Phone numbers are stored as `(hash, last4)` for indexed lookup; the full number is column-level encrypted (`pgcrypto`).                              |
| 4 | An owner manipulates their own booking history to inflate ladder rank               | Match results require dual-side confirmation before being CONFIRMED + counted toward Glicko ratings.                                                |
| 5 | A leaked refresh token allows session hijack                                        | Refresh tokens are Argon2id-hashed at rest, bound to a device fingerprint, rotated on use. Reuse triggers a global session revoke for that user.    |
| 6 | A compromised owner account drains payouts to a new bank account                    | Payout-account changes require re-auth + email + Zalo OA confirmation. 7-day cool-down before a new account becomes eligible.                       |
| 7 | OWASP top 10: SQLi, XSS, SSRF                                                        | Prisma parameterises everything; no raw SQL outside `packages/db`. Next.js auto-escapes. SSRF: no user-supplied URLs fetched server-side.           |
| 8 | Excessive OTP requests (toll fraud, abuse)                                          | 3 OTPs / 10min per phone, exponential back-off on failed verify, max 5 attempts per OTP.                                                            |

## Data classification

- **Sensitive PII** (phone, dob, address): encrypted at rest, redacted from logs (Pino redaction config in `packages/observability/logger.ts`).
- **Booking + payment records**: 5-year retention per VN accounting requirements; soft-delete only.
- **Audit log**: append-only `AuditLog` table; CDC-replicated to cold storage nightly.

## Data residency

Per Decree 53/2022, personal data of VN users must be storable on VN-resident infrastructure. Default targets: **VNG Cloud (Ho Chi Minh)** or **Viettel IDC (Hanoi)**. The Helm chart works on any K8s; the Terraform stub is AWS-shaped but is meant to be re-targetable.

## Webhook signing — full detail

| Gateway  | Algorithm        | Field signed                                                                | Where the secret comes from         |
| -------- | ---------------- | --------------------------------------------------------------------------- | ------------------------------------ |
| VNPay    | HMAC-SHA512      | URL-encoded query string of all `vnp_*` fields except `vnp_SecureHash`      | `VNPAY_HASH_SECRET`                  |
| MoMo     | HMAC-SHA256      | Concatenated `key=value` of fixed field list in lexicographic order         | `MOMO_SECRET_KEY`                    |
| ZaloPay  | HMAC-SHA256      | JSON `data` field as received                                               | `ZALOPAY_KEY2`                       |
| Zalo OA  | HMAC-SHA256      | Raw request body                                                            | `ZALO_OA_SECRET`                     |

All comparisons use `crypto.timingSafeEqual` so signature checks are constant-time.
