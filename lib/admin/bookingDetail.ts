import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { overlapsAny } from "@/lib/booking/manila";
import type {
  BookingAddonRow,
  BookingRow,
  HistoryRow,
} from "@/lib/types/admin";

export type BookingDetail = {
  booking: BookingRow;
  category: string;
  addons: BookingAddonRow[];
  history: HistoryRow[];
  clash: boolean;
};

/** Everything the booking detail page and the slide-in panel show. Null when the booking does not exist. */
export async function loadBookingDetail(
  supabase: SupabaseClient,
  id: string,
): Promise<BookingDetail | null> {
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const b = data as BookingRow;

  const [catRes, addonsRes, historyRes] = await Promise.all([
    supabase
      .from("event_categories")
      .select("name")
      .eq("id", b.category_id)
      .maybeSingle(),
    supabase
      .from("booking_addons")
      .select("id,name_snapshot,quantity,line_total")
      .eq("booking_id", id),
    supabase
      .from("booking_status_history")
      .select("id,from_status,to_status,changed_at,note")
      .eq("booking_id", id)
      .order("changed_at", { ascending: false }),
  ]);

  // For a request that is not confirmed yet: does its time already collide with a confirmed booking?
  let clash = false;
  if (
    (b.status === "pending_confirmation" || b.status === "inquiry") &&
    b.starts_at &&
    b.ends_at
  ) {
    const s = Date.parse(b.starts_at);
    const e = Date.parse(b.ends_at);
    const { data: ranges } = await supabase.rpc("busy_ranges", {
      p_from: new Date(s - 86400000).toISOString(),
      p_to: new Date(e + 86400000).toISOString(),
    });
    clash = overlapsAny(
      s,
      e,
      ((ranges ?? []) as { starts_at: string; ends_at: string }[]).map((r) => ({
        s: Date.parse(r.starts_at),
        e: Date.parse(r.ends_at),
      })),
    );
  }

  return {
    booking: b,
    category: (catRes.data?.name as string | undefined) ?? "",
    addons: (addonsRes.data ?? []) as BookingAddonRow[],
    history: (historyRes.data ?? []) as HistoryRow[],
    clash,
  };
}