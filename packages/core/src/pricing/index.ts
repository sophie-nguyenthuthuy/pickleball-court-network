import { dayOfWeek, isOverlap, minuteOfDay, type TimeRange } from '../time/index.js';
import { errors } from '../errors.js';
import { sum, vnd, type Vnd, applyBps } from '../money.js';

export interface PeakWindow {
  startMinute: number;
  endMinute: number;
}

export interface PriceRule {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  basePriceVnd: bigint;
  peakPriceVnd: bigint | null;
  peakWindows: PeakWindow[];
}

/**
 * Platform fee defaults to 8% of booking value, paid by the venue out of the booking.
 * Override per-venue in venue.amenities.fee_bps if negotiated.
 */
export const DEFAULT_PLATFORM_FEE_BPS = 800;

export interface QuoteResult {
  totalVnd: Vnd;
  platformFeeVnd: Vnd;
  segments: Array<{
    range: TimeRange;
    minutes: number;
    rateVnd: Vnd;
    amountVnd: Vnd;
    isPeak: boolean;
  }>;
}

const isMinuteInWindow = (minute: number, w: PeakWindow): boolean =>
  minute >= w.startMinute && minute < w.endMinute;

const findRule = (rules: PriceRule[], r: TimeRange): PriceRule | null => {
  const dow = dayOfWeek(r.start);
  const sm = minuteOfDay(r.start);
  return (
    rules.find((rule) => rule.dayOfWeek === dow && rule.startMinute <= sm && rule.endMinute > sm) ??
    null
  );
};

/**
 * Quote a booking by breaking it into 30-minute slots and pricing each one
 * with peak / off-peak rules. Returns line-item segments so the UI can show
 * a transparent breakdown.
 */
export const quote = (
  range: TimeRange,
  rules: PriceRule[],
  opts: { feeBps?: number; slotMinutes?: number } = {},
): QuoteResult => {
  const slotMinutes = opts.slotMinutes ?? 30;
  if (range.end <= range.start) {
    throw errors.validation('end must be after start');
  }
  const segments: QuoteResult['segments'] = [];
  let cursor = new Date(range.start);
  while (cursor < range.end) {
    const segEnd = new Date(Math.min(cursor.getTime() + slotMinutes * 60_000, range.end.getTime()));
    const seg: TimeRange = { start: cursor, end: segEnd };
    const rule = findRule(rules, seg);
    if (!rule) {
      throw errors.slotUnavailable('Court is not open for the requested time window');
    }
    const sm = minuteOfDay(seg.start);
    const isPeak = !!rule.peakPriceVnd && rule.peakWindows.some((w) => isMinuteInWindow(sm, w));
    const ratePerHour = isPeak && rule.peakPriceVnd ? rule.peakPriceVnd : rule.basePriceVnd;
    const minutes = (segEnd.getTime() - cursor.getTime()) / 60_000;
    const amountVnd = (ratePerHour * BigInt(Math.round(minutes))) / 60n;
    segments.push({ range: seg, minutes, rateVnd: ratePerHour, amountVnd, isPeak });
    cursor = segEnd;
  }
  const totalVnd = sum(...segments.map((s) => s.amountVnd));
  const platformFeeVnd = applyBps(totalVnd, opts.feeBps ?? DEFAULT_PLATFORM_FEE_BPS);
  return { totalVnd, platformFeeVnd, segments };
};

/** Re-export so callers can stay inside @pcn/core/pricing. */
export { vnd, type Vnd };

/** Sanity check used by core.booking before persistence. */
export const assertNoExceptionOverlap = (
  range: TimeRange,
  exceptions: Array<TimeRange & { kind: 'CLOSED' | 'MAINTENANCE' | 'OWNER_BLOCK' | 'SPECIAL_PRICE' }>,
): void => {
  const blocker = exceptions.find(
    (e) => e.kind !== 'SPECIAL_PRICE' && isOverlap(range, e),
  );
  if (blocker) throw errors.slotUnavailable('Court is blocked for this time window');
};
