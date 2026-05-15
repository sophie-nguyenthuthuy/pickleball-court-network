import { z } from 'zod';

import { errors } from '../errors.js';
import { bookingCode } from '../id.js';
import { type Vnd } from '../money.js';
import { quote, assertNoExceptionOverlap, type PriceRule } from '../pricing/index.js';
import {
  SLOT_GRID_MINUTES,
  durationMinutes,
  isAlignedToGrid,
  isOverlap,
  nowVn,
  type TimeRange,
} from '../time/index.js';

import { LIVE_STATUSES, type BookingStatus } from './state.js';

export const CreateBookingInput = z.object({
  courtId: z.string().uuid(),
  organizerId: z.string().uuid(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  source: z.enum(['WEB', 'MOBILE', 'ZALO_OA', 'OWNER_DIRECT', 'ADMIN', 'API']),
  notes: z.string().max(500).optional(),
  participants: z
    .array(
      z.object({
        userId: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        phone: z.string().optional(),
        isOrganizer: z.boolean().default(false),
      }),
    )
    .max(8)
    .default([]),
  idempotencyKey: z.string().min(8).max(128),
});

export type CreateBookingInput = z.infer<typeof CreateBookingInput>;

export interface ExistingBookingRow {
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
}

export interface ExceptionRow {
  startAt: Date;
  endAt: Date;
  kind: 'CLOSED' | 'MAINTENANCE' | 'OWNER_BLOCK' | 'SPECIAL_PRICE';
}

export interface BookingPlan {
  code: string;
  range: TimeRange;
  durationMinutes: number;
  priceVnd: Vnd;
  platformFeeVnd: Vnd;
  segments: ReturnType<typeof quote>['segments'];
  expiresAt: Date;
}

export interface BookingPolicy {
  /** Minimum lead time before the slot. */
  minLeadMinutes: number;
  /** Maximum booking window into the future. */
  maxAdvanceDays: number;
  /** Minimum booking duration. */
  minMinutes: number;
  /** Maximum booking duration. */
  maxMinutes: number;
  /** Hold expiry window for PENDING_PAYMENT bookings. */
  holdMinutes: number;
}

export const DEFAULT_POLICY: BookingPolicy = {
  minLeadMinutes: 30,
  maxAdvanceDays: 30,
  minMinutes: 60,
  maxMinutes: 180,
  holdMinutes: 10,
};

/**
 * Pure planning step: validates the request, prices it, and produces a
 * BookingPlan that the persistence layer can write in a transaction.
 *
 * Does NOT mutate the DB — that's the caller's responsibility. The function
 * is pure so it can be exhaustively unit-tested without spinning up Postgres.
 */
export const planBooking = (
  input: CreateBookingInput,
  ctx: {
    rules: PriceRule[];
    existing: ExistingBookingRow[];
    exceptions: ExceptionRow[];
    policy?: BookingPolicy;
    now?: Date;
  },
): BookingPlan => {
  const policy = ctx.policy ?? DEFAULT_POLICY;
  const now = ctx.now ?? nowVn();
  const range: TimeRange = { start: input.startAt, end: input.endAt };

  // shape
  if (range.end <= range.start) throw errors.validation('endAt must be after startAt');
  const minutes = durationMinutes(range);
  if (minutes < policy.minMinutes)
    throw errors.validation(`Minimum booking is ${policy.minMinutes} minutes`);
  if (minutes > policy.maxMinutes)
    throw errors.validation(`Maximum booking is ${policy.maxMinutes} minutes`);
  if (!isAlignedToGrid(range))
    throw errors.validation(`Bookings must align to ${SLOT_GRID_MINUTES}-minute grid`);

  // temporal sanity
  const leadMs = range.start.getTime() - now.getTime();
  if (leadMs < policy.minLeadMinutes * 60_000)
    throw errors.validation(
      `Bookings must be at least ${policy.minLeadMinutes} minutes in advance`,
    );
  const horizonMs = policy.maxAdvanceDays * 24 * 60 * 60 * 1000;
  if (leadMs > horizonMs)
    throw errors.validation(`Bookings cannot be more than ${policy.maxAdvanceDays} days ahead`);

  // exceptions (closures / maintenance / owner block)
  assertNoExceptionOverlap(
    range,
    ctx.exceptions.map((e) => ({ start: e.startAt, end: e.endAt, kind: e.kind })),
  );

  // conflict with live bookings
  const conflict = ctx.existing.find(
    (b) => LIVE_STATUSES.includes(b.status) && isOverlap(range, { start: b.startAt, end: b.endAt }),
  );
  if (conflict) throw errors.slotUnavailable();

  const q = quote(range, ctx.rules);
  return {
    code: bookingCode(now),
    range,
    durationMinutes: minutes,
    priceVnd: q.totalVnd,
    platformFeeVnd: q.platformFeeVnd,
    segments: q.segments,
    expiresAt: new Date(now.getTime() + policy.holdMinutes * 60_000),
  };
};

/**
 * Cancellation refund policy. Refund amount in VND, computed from the
 * paid amount and the lead time to the slot start.
 *
 *   ≥ 24h  : 100%
 *   ≥ 12h  :  50%
 *   ≥  4h  :  20%
 *   <  4h  :   0%
 */
export const refundForCancellation = (paidVnd: Vnd, slotStart: Date, now: Date = nowVn()): Vnd => {
  const leadHours = (slotStart.getTime() - now.getTime()) / 3_600_000;
  if (leadHours >= 24) return paidVnd;
  if (leadHours >= 12) return (paidVnd * 1n) / 2n;
  if (leadHours >= 4) return (paidVnd * 1n) / 5n;
  return 0n;
};
