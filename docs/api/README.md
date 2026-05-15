# API reference

The full OpenAPI document is served at `https://api.pcn.vn/docs` (Swagger UI) and `https://api.pcn.vn/openapi.json` (JSON). What follows is a quick tour for partners.

## Auth

```
POST /v1/auth/otp/request   { phone, channel }
POST /v1/auth/otp/verify    { phone, code }     → { accessToken, refreshToken }
GET  /v1/auth/zalo/login-url                    → { url, state }
```

Send `Authorization: Bearer <accessToken>` on all authenticated routes.

## Discovery

```
GET  /v1/venues?city=&district=&sport=&near_lat=&near_lng=&radius_km=&page=
GET  /v1/venues/:slug
GET  /v1/courts/:courtId/slots?date=YYYY-MM-DD
```

## Booking

```
POST /v1/bookings           (auth required)
  body: { courtId, startAt, endAt, source, idempotencyKey, notes?, participants? }
GET  /v1/bookings/:id       (auth required)
POST /v1/bookings/:id/cancel
```

All booking mutations require `idempotencyKey`. Repeated calls with the same key return the original booking.

## Payment

```
POST /v1/payments/init      { bookingId, gateway: VNPAY|MOMO|ZALOPAY }
                            → { redirectUrl }
```

Webhooks (gateway → us) — never call these from client code:

```
POST /webhooks/vnpay
POST /webhooks/momo
POST /webhooks/zalopay
POST /webhooks/zalo-oa
```

## Ladder & tournaments

```
GET  /v1/ladders?city=&sport=
GET  /v1/ladders/:slug
POST /v1/ladders/:ladderId/matches

GET  /v1/tournaments
GET  /v1/tournaments/:slug
POST /v1/tournaments/:tournamentId/register
POST /v1/tournaments/:tournamentId/divisions/:divisionId/draw   (admin only)
```

## WebSocket

```
ws://api.pcn.vn/ws/court/:courtId         (live slot updates)
ws://api.pcn.vn/ws/tournament/:slug       (live scoring)
```

## Errors

```jsonc
// 4xx + 5xx all use the same shape
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "Time slot is no longer available",
    "details": { /* optional */ }
  }
}
```

Codes used: `VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT`, `SLOT_UNAVAILABLE`, `PAYMENT_FAILED`, `PAYMENT_SIGNATURE_INVALID`, `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`, `IDEMPOTENCY_CONFLICT`, `INTERNAL`.
