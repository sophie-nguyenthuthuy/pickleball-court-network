/** Common time-of-day price rules used in fixtures. */
export const standardPriceRules = Array.from({ length: 7 }, (_, day) => ({
  dayOfWeek: day,
  startMinute: 6 * 60,
  endMinute: 22 * 60,
  basePriceVnd: 180_000n,
  peakPriceVnd: 260_000n,
  peakWindows: [{ startMinute: 17 * 60, endMinute: 21 * 60 }],
}));
