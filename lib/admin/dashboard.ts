// Numbers for the admin overview, worked out from the real booking rows. Plain functions, no database.
import { addDays, dayKey, MONTH_NAMES } from "../booking/manila";

export const RANGES = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

export function rangeFor(value: unknown): RangeKey {
  return RANGES.find((r) => r.key === value)?.key ?? "month";
}

export type Bucket = {
  key: string; // day "YYYY-MM-DD" or month "YYYY-MM"
  label: string; // short text under the bar
  received: number; // requests that came in during the bucket
  confirmed: number; // of those, how many are confirmed or completed now
};

type Row = { status: string; created_at: string };
const KEPT = new Set(["confirmed", "completed"]);

/** Monday of the week that contains `key`. */
export function weekStart(key: string): string {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(key, -((dow + 6) % 7));
}

/** The bars of the booking activity chart for a range, ending at `today` (a Manila date key). */
export function activitySeries(
  rows: Row[],
  range: RangeKey,
  today: string,
): Bucket[] {
  let buckets: Bucket[];
  if (range === "week") {
    const start = weekStart(today);
    buckets = Array.from({ length: 7 }, (_, i) => {
      const key = addDays(start, i);
      const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i];
      return { key, label: dow, received: 0, confirmed: 0 };
    });
  } else if (range === "month") {
    const [y, m] = today.split("-").map(Number);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    buckets = Array.from({ length: days }, (_, i) => {
      const d = i + 1;
      const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { key, label: String(d), received: 0, confirmed: 0 };
    });
  } else {
    const y = Number(today.slice(0, 4));
    buckets = Array.from({ length: 12 }, (_, i) => ({
      key: `${y}-${String(i + 1).padStart(2, "0")}`,
      label: MONTH_NAMES[i].slice(0, 3),
      received: 0,
      confirmed: 0,
    }));
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const r of rows) {
    const day = dayKey(Date.parse(r.created_at));
    const at = index.get(range === "year" ? day.slice(0, 7) : day);
    if (at === undefined) continue;
    buckets[at].received += 1;
    if (KEPT.has(r.status)) buckets[at].confirmed += 1;
  }
  return buckets;
}

/** "Good morning" / "Good afternoon" / "Good evening" for a moment, in Manila. */
export function greetingFor(nowMs: number): string {
  const hour = new Date(nowMs + 8 * 3600000).getUTCHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** A first name for the greeting, or "" when the account name is just an email address. */
export function firstName(display: string): string {
  const t = display.trim();
  if (!t || t.includes("@")) return "";
  return t.split(/\s+/)[0];
}