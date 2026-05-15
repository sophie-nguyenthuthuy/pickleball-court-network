import { addMinutes, differenceInMinutes, startOfDay } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

export const VN_TZ = 'Asia/Ho_Chi_Minh';

export const nowVn = (): Date => toZonedTime(new Date(), VN_TZ);

export const toVn = (d: Date): Date => toZonedTime(d, VN_TZ);

export const fromVnLocal = (d: Date): Date => fromZonedTime(d, VN_TZ);

export const formatVn = (d: Date, fmt = 'yyyy-MM-dd HH:mm'): string =>
  formatInTimeZone(d, VN_TZ, fmt);

export interface TimeRange {
  start: Date;
  end: Date;
}

export const isOverlap = (a: TimeRange, b: TimeRange): boolean =>
  a.start < b.end && b.start < a.end;

export const durationMinutes = (r: TimeRange): number => differenceInMinutes(r.end, r.start);

/**
 * Slot-grid alignment. PCN normalises all bookings to a 30-minute grid so the
 * UI can render a uniform schedule. Owners can override via venue settings later.
 */
export const SLOT_GRID_MINUTES = 30;

export const isAlignedToGrid = (r: TimeRange, gridMinutes = SLOT_GRID_MINUTES): boolean => {
  const startMin = r.start.getUTCMinutes() + r.start.getUTCHours() * 60;
  const endMin = r.end.getUTCMinutes() + r.end.getUTCHours() * 60;
  return startMin % gridMinutes === 0 && endMin % gridMinutes === 0;
};

export const enumerateSlots = (
  day: Date,
  startMinute: number,
  endMinute: number,
  gridMinutes = SLOT_GRID_MINUTES,
): TimeRange[] => {
  const base = startOfDay(day);
  const slots: TimeRange[] = [];
  for (let m = startMinute; m + gridMinutes <= endMinute; m += gridMinutes) {
    slots.push({
      start: addMinutes(base, m),
      end: addMinutes(base, m + gridMinutes),
    });
  }
  return slots;
};

/** Vietnamese day-of-week: 0=Sun…6=Sat to match Postgres extract(dow). */
export const dayOfWeek = (d: Date): number => toVn(d).getDay();

export const minuteOfDay = (d: Date): number => {
  const local = toVn(d);
  return local.getHours() * 60 + local.getMinutes();
};
