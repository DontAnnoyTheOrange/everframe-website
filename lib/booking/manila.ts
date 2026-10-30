// Date and time helpers for the booking calendar. Everframe works in Philippine time (Asia/Manila, UTC+8).
// The Philippines has no daylight saving, so a fixed +08:00 offset is always correct.
// Dates travel as plain "YYYY-MM-DD" text and times as "HH:MM" text, and are joined into one exact moment here.

export const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The hours a booking may start. The calendar greys out a day once these are all taken. */
export const FIRST_START_HOUR = 6;
export const LAST_START_HOUR = 22;

export type Busy = { s: number; e: number }; // start and end, in milliseconds since 1970

/** "2026-11-05" for the given moment, in Manila. */
export function dayKey(ms: number): string {
  return new Date(ms + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Is this text a real calendar date (not 2026-02-31)? */
export function isRealDate(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key;
}

/** The exact moment a date + time starts in Manila, in milliseconds. */
export function manilaMs(date: string, time: string): number {
  return Date.parse(`${date}T${time}:00+08:00`);
}

/** ISO text with the Manila offset, ready to send to the database. */
export function manilaIso(date: string, time: string): string {
  return `${date}T${time}:00+08:00`;
}

/** Add days to a "YYYY-MM-DD" key. */
export function addDays(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Half-hour start times: "06:00", "06:30" ... "22:00". */
export function startTimes(): string[] {
  const out: string[] = [];
  for (let h = FIRST_START_HOUR; h <= LAST_START_HOUR; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    if (h < LAST_START_HOUR) out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
}

/** "6:00 AM" style label for a Manila clock time. */
export function timeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Label for an instant, as Manila clock time. */
export function instantTimeLabel(ms: number): string {
  return timeLabel(new Date(ms + MANILA_OFFSET_MS).toISOString().slice(11, 16));
}

/** Do two time ranges overlap? Touching ends do not count. */
export function overlaps(aStart: number, aEnd: number, b: Busy): boolean {
  return aStart < b.e && aEnd > b.s;
}

export function overlapsAny(
  startMs: number,
  endMs: number,
  busy: Busy[],
): boolean {
  return busy.some((b) => overlaps(startMs, endMs, b));
}

/** The busy ranges that touch this day, clipped to the day. */
export function busyOnDay(key: string, busy: Busy[]): Busy[] {
  const dayStart = manilaMs(key, "00:00");
  const dayEnd = dayStart + DAY_MS;
  return busy
    .filter((b) => overlaps(dayStart, dayEnd, b))
    .map((b) => ({ s: Math.max(b.s, dayStart), e: Math.min(b.e, dayEnd) }))
    .sort((x, y) => x.s - y.s);
}

/** True when no start time on this day is free (the busy ranges cover every possible start). */
export function dayIsFull(key: string, busy: Busy[]): boolean {
  const ranges = busyOnDay(key, busy);
  if (ranges.length === 0) return false;
  return startTimes().every((t) => {
    const ms = manilaMs(key, t);
    return ranges.some((b) => ms >= b.s && ms < b.e);
  });
}

export type Cell = { key: string; day: number } | null;

/** A month as weeks of 7 cells (Sunday first). year is 4 digits, month is 1 to 12. */
export function monthGrid(year: number, month: number): Cell[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = first.getUTCDay();
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Cell[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= length; d++) {
    cells.push({
      key: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Month number (1-12) and year after adding `offset` months to a starting year and month. */
export function addMonths(year: number, month: number, offset: number) {
  const index = year * 12 + (month - 1) + offset;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Today's date in Manila. Kept here so pages do not call Date.now() while rendering. */
export function todayInManila(): string {
  return dayKey(Date.now());
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "Sat, Nov 28, 2026" for an ISO timestamp, in Manila time. */
export function formatManilaDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** "9:00 AM" for an ISO timestamp, in Manila time. */
export function formatManilaTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** "Sat, Nov 28, 2026, 9:00 AM to 1:00 PM" (or "no date yet" for inquiries). */
export function formatManilaRange(
  start: string | null,
  end: string | null,
): string {
  if (!start || !end) return "No date yet";
  return `${formatManilaDate(start)}, ${formatManilaTime(start)} to ${formatManilaTime(end)}`;
}

/** Current moment as ISO text, so pages do not call Date.now() while rendering. */
export function nowIso(): string {
  return new Date().toISOString();
}