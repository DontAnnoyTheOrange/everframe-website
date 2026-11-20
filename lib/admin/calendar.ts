// Date maths for the admin calendar (month, week and day views), all in Manila time.
import { addDays, dayKey, isRealDate, manilaMs, monthGrid } from "../booking/manila";
import { weekStart } from "./dashboard";

export const VIEWS = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
] as const;
export type ViewKey = (typeof VIEWS)[number]["key"];

export function viewFor(value: unknown): ViewKey {
  return VIEWS.find((v) => v.key === value)?.key ?? "month";
}

/** A usable date from the address bar, or `fallback` (today) when it is missing or not a real date. */
export function dateOr(value: unknown, fallback: string): string {
  return typeof value === "string" && isRealDate(value) ? value : fallback;
}

/** The days shown for a view: a month grid (whole weeks, Monday first), one week, or one day. */
export function visibleDays(view: ViewKey, date: string): string[] {
  if (view === "day") return [date];
  if (view === "week") {
    const s = weekStart(date);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }
  const [y, m] = date.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = addDays(
    `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`,
    -1,
  );
  const start = weekStart(first);
  const end = addDays(weekStart(last), 6);
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** The date the Previous / Next buttons lead to. */
export function shiftDate(view: ViewKey, date: string, dir: -1 | 1): string {
  if (view === "day") return addDays(date, dir);
  if (view === "week") return addDays(date, 7 * dir);
  const [y, m] = date.split("-").map(Number);
  const idx = y * 12 + (m - 1) + dir;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}-01`;
}

export type CalEvent = {
  kind: "booking" | "block";
  id: string;
  starts: string;
  ends: string;
  title: string;
  detail: string;
};

/** Does the event take up any part of this Manila day? (A block ending exactly at midnight does not.) */
export function onDay(e: CalEvent, day: string): boolean {
  const s = Date.parse(e.starts);
  const en = Date.parse(e.ends);
  return s < manilaMs(addDays(day, 1), "00:00") && en > manilaMs(day, "00:00");
}

/** True when a block covers the whole day: the day cannot be booked at all. */
export function dayFullyBlocked(events: CalEvent[], day: string): boolean {
  const s = manilaMs(day, "00:00");
  const e = manilaMs(addDays(day, 1), "00:00");
  return events.some(
    (x) =>
      x.kind === "block" && Date.parse(x.starts) <= s && Date.parse(x.ends) >= e,
  );
}

export function eventsByDay(events: CalEvent[], days: string[]) {
  const sorted = [...events].sort(
    (a, b) => Date.parse(a.starts) - Date.parse(b.starts),
  );
  return new Map(days.map((d) => [d, sorted.filter((e) => onDay(e, d))]));
}

/** Month and year title, "November 2026". */
export function monthTitle(date: string): string {
  const d = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function dayTitle(day: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${day}T00:00:00Z`));
}

export function weekTitle(date: string): string {
  const d = visibleDays("week", date);
  const f = (k: string, opt: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opt }).format(
      new Date(`${k}T00:00:00Z`),
    );
  return `${f(d[0], { month: "short", day: "numeric" })} – ${f(d[6], { month: "short", day: "numeric", year: "numeric" })}`;
}

export const todayKey = (nowMs: number) => dayKey(nowMs);
export { monthGrid };