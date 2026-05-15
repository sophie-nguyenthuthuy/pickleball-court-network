/**
 * Booking lifecycle. Mirrors the BookingStatus enum in the DB.
 *
 * Allowed transitions:
 *
 *   PENDING_PAYMENT ──pay──▶ CONFIRMED
 *   PENDING_PAYMENT ──timeout──▶ EXPIRED
 *   PENDING_PAYMENT ──user cancel──▶ CANCELLED
 *   CONFIRMED ──cancel(within policy)──▶ CANCELLED
 *   CONFIRMED ──start time reached──▶ IN_PROGRESS
 *   IN_PROGRESS ──end time reached──▶ COMPLETED
 *   CONFIRMED ──no show──▶ NO_SHOW
 *
 * No transitions out of CANCELLED / COMPLETED / NO_SHOW / EXPIRED.
 */

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'EXPIRED';

export type BookingEvent =
  | { kind: 'PAYMENT_CAPTURED' }
  | { kind: 'PAYMENT_FAILED' }
  | { kind: 'CANCEL'; actor: 'USER' | 'OWNER' | 'ADMIN'; reason?: string }
  | { kind: 'EXPIRE' }
  | { kind: 'START' }
  | { kind: 'COMPLETE' }
  | { kind: 'NO_SHOW' };

const TRANSITIONS: Record<BookingStatus, Partial<Record<BookingEvent['kind'], BookingStatus>>> = {
  PENDING_PAYMENT: {
    PAYMENT_CAPTURED: 'CONFIRMED',
    PAYMENT_FAILED: 'CANCELLED',
    CANCEL: 'CANCELLED',
    EXPIRE: 'EXPIRED',
  },
  CONFIRMED: {
    CANCEL: 'CANCELLED',
    START: 'IN_PROGRESS',
    NO_SHOW: 'NO_SHOW',
  },
  IN_PROGRESS: {
    COMPLETE: 'COMPLETED',
  },
  COMPLETED: {},
  CANCELLED: {},
  NO_SHOW: {},
  EXPIRED: {},
};

export const canTransition = (from: BookingStatus, event: BookingEvent['kind']): boolean =>
  TRANSITIONS[from][event] != null;

export const nextStatus = (from: BookingStatus, event: BookingEvent['kind']): BookingStatus => {
  const next = TRANSITIONS[from][event];
  if (!next) {
    throw new Error(`Illegal booking transition: ${from} --${event}-->`);
  }
  return next;
};

/** Statuses that occupy a court slot (i.e. should block other bookings). */
export const LIVE_STATUSES: ReadonlyArray<BookingStatus> = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'IN_PROGRESS',
];

export const isTerminal = (s: BookingStatus): boolean =>
  s === 'COMPLETED' || s === 'CANCELLED' || s === 'NO_SHOW' || s === 'EXPIRED';
