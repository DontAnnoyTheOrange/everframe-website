import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type { Busy } from "@/lib/booking/manila";

// Times already taken, for the public calendar. The database function returns only start and end
// times (no names, no contact details). Confirmed bookings already include the travel buffer.
// Returns null when it cannot be loaded, so the page can warn instead of showing a wrong calendar.
export async function getBusyRanges(daysAhead = 366): Promise<Busy[] | null> {
  const db = createPublicClient();
  if (!db) return null;
  const from = new Date();
  const to = new Date(from.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const { data, error } = await db.rpc("busy_ranges", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) {
    console.error("busy_ranges failed:", error.message);
    return null;
  }
  return (data as { starts_at: string; ends_at: string }[]).map((r) => ({
    s: Date.parse(r.starts_at),
    e: Date.parse(r.ends_at),
  }));
}