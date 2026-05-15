# Runbook — Payment stuck in PENDING / booking stuck in PENDING_PAYMENT

> Severity: SEV-2 if isolated; SEV-1 if more than 1% of payments in the last hour are affected.

## Detection

- Player reports having paid but the booking never confirmed.
- Or: dashboard panel `payments_pending_over_5min` > 0.

## Triage

1. Pull the latest payment by booking code:
   ```sql
   SELECT p.*, b.code, b.status FROM "Payment" p
     JOIN "Booking" b ON b.id = p."bookingId"
   WHERE b.code = 'PCN-2026-...';
   ```
2. Check `Payment.rawCallback`. If null, no IPN arrived → likely a gateway-side delivery issue.
3. Check the gateway's merchant dashboard (VNPay merchant portal / MoMo Partner / ZaloPay Merchant) for the txn status.

## Resolve

**Case A — gateway shows SUCCESS, but we have no IPN:**
- Manually flip the payment: `UPDATE "Payment" SET status='CAPTURED', capturedAt=NOW(), gatewayTxnId='<...>' WHERE id='<...>';`
- Then `UPDATE "Booking" SET status='CONFIRMED', confirmedAt=NOW() WHERE id='<...>';`
- Insert a `BookingTimeline` row with event `PAYMENT_CAPTURED_MANUAL` and `payload` containing the operator id.
- Insert an `OutboxEvent("booking.confirmed")` so the worker still sends the Zalo confirmation.

**Case B — gateway shows FAILED:**
- `UPDATE "Booking" SET status='CANCELLED', cancellationReason='payment-failed' WHERE id='<...>'`
- Notify the player via Zalo OA; suggest retry.

**Case C — gateway says nothing happened:**
- Let the hold-expiry sweeper handle it (booking → EXPIRED after 10 minutes).
- Apologise via Zalo OA, refund any "ghost" gateway debit if the player can produce evidence.

## Postmortem trigger

If Case A happens for the same gateway twice in 24h, file a ticket with the gateway and add an IPN-delivery monitor for that gateway specifically.
