import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors.js';

import { planBooking, refundForCancellation } from './engine.js';

const PRICE_RULES = [
  // every day 06:00 - 22:00, base 180k, peak 260k 17:00-21:00
  ...Array.from({ length: 7 }, (_, day) => ({
    dayOfWeek: day,
    startMinute: 6 * 60,
    endMinute: 22 * 60,
    basePriceVnd: 180_000n,
    peakPriceVnd: 260_000n,
    peakWindows: [{ startMinute: 17 * 60, endMinute: 21 * 60 }],
  })),
];

const at = (iso: string) => new Date(iso);

describe('planBooking', () => {
  const baseCtx = {
    rules: PRICE_RULES,
    existing: [],
    exceptions: [],
    now: at('2026-05-15T09:00:00+07:00'),
  };

  it('prices an off-peak 1h slot at base rate', () => {
    const plan = planBooking(
      {
        courtId: '00000000-0000-0000-0000-000000000001',
        organizerId: '00000000-0000-0000-0000-000000000002',
        startAt: at('2026-05-16T08:00:00+07:00'),
        endAt: at('2026-05-16T09:00:00+07:00'),
        source: 'WEB',
        participants: [],
        idempotencyKey: 'idem_test_1',
      },
      baseCtx,
    );
    expect(plan.priceVnd).toBe(180_000n);
    expect(plan.code).toMatch(/^PCN-2026-[A-Z2-9]{6}$/);
  });

  it('charges peak rate inside the peak window', () => {
    const plan = planBooking(
      {
        courtId: '00000000-0000-0000-0000-000000000001',
        organizerId: '00000000-0000-0000-0000-000000000002',
        startAt: at('2026-05-16T18:00:00+07:00'),
        endAt: at('2026-05-16T19:00:00+07:00'),
        source: 'WEB',
        participants: [],
        idempotencyKey: 'idem_test_2',
      },
      baseCtx,
    );
    expect(plan.priceVnd).toBe(260_000n);
  });

  it('rejects overlap with a live booking', () => {
    expect(() =>
      planBooking(
        {
          courtId: '00000000-0000-0000-0000-000000000001',
          organizerId: '00000000-0000-0000-0000-000000000002',
          startAt: at('2026-05-16T08:00:00+07:00'),
          endAt: at('2026-05-16T09:00:00+07:00'),
          source: 'WEB',
          participants: [],
          idempotencyKey: 'idem_test_3',
        },
        {
          ...baseCtx,
          existing: [
            {
              startAt: at('2026-05-16T08:30:00+07:00'),
              endAt: at('2026-05-16T09:30:00+07:00'),
              status: 'CONFIRMED',
            },
          ],
        },
      ),
    ).toThrow(DomainError);
  });

  it('rejects bookings not aligned to the 30-minute grid', () => {
    expect(() =>
      planBooking(
        {
          courtId: '00000000-0000-0000-0000-000000000001',
          organizerId: '00000000-0000-0000-0000-000000000002',
          startAt: at('2026-05-16T08:15:00+07:00'),
          endAt: at('2026-05-16T09:15:00+07:00'),
          source: 'WEB',
          participants: [],
          idempotencyKey: 'idem_test_4',
        },
        baseCtx,
      ),
    ).toThrow(/grid/);
  });
});

describe('refundForCancellation', () => {
  const now = at('2026-05-15T09:00:00+07:00');
  it('full refund ≥ 24h out', () => {
    expect(refundForCancellation(200_000n, at('2026-05-16T10:00:00+07:00'), now)).toBe(200_000n);
  });
  it('50% refund 12-24h out', () => {
    expect(refundForCancellation(200_000n, at('2026-05-15T22:00:00+07:00'), now)).toBe(100_000n);
  });
  it('20% refund 4-12h out', () => {
    expect(refundForCancellation(200_000n, at('2026-05-15T14:00:00+07:00'), now)).toBe(40_000n);
  });
  it('no refund < 4h out', () => {
    expect(refundForCancellation(200_000n, at('2026-05-15T11:00:00+07:00'), now)).toBe(0n);
  });
});
