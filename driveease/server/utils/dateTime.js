/**
 * Date helpers. Booking dates are stored as "YYYY-MM-DD" strings and times as "HH:mm"
 * in the business timezone; absolute instants (pickupAt / tripEndAt) are derived with
 * the configured UTC offset so the server's own timezone never matters.
 */
import { env } from '../config/env.js';

export const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidDateStr = (s) => {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
export const isValidTimeStr = (s) => typeof s === 'string' && TIME_RE.test(s);

export const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** Convert business-local date + time to an absolute Date. */
export function toInstant(dateStr, timeStr = '00:00', offsetMinutes = env.tzOffsetMinutes) {
  const utc = Date.parse(`${dateStr}T${timeStr}:00Z`);
  return new Date(utc - offsetMinutes * 60000);
}

/** End of the given business-local day (23:59:59.999). */
export const endOfDayInstant = (dateStr, offsetMinutes = env.tzOffsetMinutes) =>
  new Date(toInstant(dateStr, '00:00', offsetMinutes).getTime() + 86400000 - 1);

/** 0 = Sunday ... 6 = Saturday */
export const dayOfWeek = (dateStr) => new Date(`${dateStr}T12:00:00Z`).getUTCDay();

export const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Number of calendar days from a to b inclusive (a <= b). */
export const daysInclusive = (a, b) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1;

export function eachDate(a, b) {
  const out = [];
  for (let d = a; d <= b; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Today's date string in the business timezone. */
export const todayStr = (offsetMinutes = env.tzOffsetMinutes) =>
  new Date(Date.now() + offsetMinutes * 60000).toISOString().slice(0, 10);

/** Business-local date string for an instant. */
export const localDateStr = (date, offsetMinutes = env.tzOffsetMinutes) =>
  new Date(new Date(date).getTime() + offsetMinutes * 60000).toISOString().slice(0, 10);

/**
 * Whether `time` falls in [start, end). Handles windows that cross midnight
 * (e.g. 22:00 → 06:00).
 */
export function isTimeInWindow(time, start, end) {
  const t = timeToMinutes(time);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s === e) return false;
  return s < e ? t >= s && t < e : t >= s || t < e;
}

/** Whether two [start,end) instants overlap. */
export const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;
