"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { parseMessengerLink } from "@/lib/booking/messenger";
import { buildBookingPatch, checkEditBooking } from "@/lib/admin/schedule";

export type EditState = {
  ok?: boolean;
  message?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  nonce?: string;
};

const CLOSED = ["completed", "cancelled", "rejected"];

// Saves changes to a booking: contact details, venue, date, time, hours and the agreed price. Only the
// fields that really changed are sent. For a confirmed booking the database re-checks that the new
// time is free (the buffer between events included), under the same lock as every other booking change.
export async function updateBooking(
  _prev: EditState,
  formData: FormData,
): Promise<EditState> {
  const r = await save(formData);
  return r.values ? { ...r, nonce: crypto.randomUUID() } : r;
}

async function save(formData: FormData): Promise<EditState> {
  const { supabase } = await requireAdmin();
  const s = (k: string) => String(formData.get(k) ?? "");
  const id = s("bookingId");
  const values: Record<string, string> = {};
  for (const k of [
    "name",
    "email",
    "phone",
    "messenger",
    "venue",
    "date",
    "time",
    "hours",
    "totalOverride",
  ])
    values[k] = s(k);
  if (!z.uuid().safeParse(id).success)
    return { message: "Something went wrong. Please refresh.", values };

  const checked = checkEditBooking(values);
  if (!checked.ok)
    return {
      message: "Please check the highlighted fields.",
      fields: checked.fields,
      values,
    };
  const v = checked.data;

  const { data: cur, error: readError } = await supabase
    .from("bookings")
    .select(
      "id,status,client_name,client_email,client_phone,client_messenger,venue,starts_at,duration_hours,total_price",
    )
    .eq("id", id)
    .single();
  if (readError || !cur)
    return { message: "That booking could not be found.", values };

  const m = v.messenger ? parseMessengerLink(v.messenger) : null;
  const patch = buildBookingPatch(
    {
      client_name: cur.client_name as string,
      client_email: cur.client_email as string | null,
      client_phone: cur.client_phone as string | null,
      client_messenger: cur.client_messenger as string | null,
      venue: cur.venue as string | null,
      starts_at: cur.starts_at as string | null,
      duration_hours:
        cur.duration_hours === null ? null : Number(cur.duration_hours),
      total_price: cur.total_price === null ? null : Number(cur.total_price),
    },
    v,
    m && m.ok ? m.url : null,
  );
  if (Object.keys(patch).length === 0)
    return {
      message: "There is nothing to save: no changes were made.",
      values,
    };
  if (
    CLOSED.includes(cur.status as string) &&
    ("starts_at" in patch || "duration_hours" in patch)
  )
    return {
      message:
        "This booking is closed, so its date, time and hours can no longer be changed. You can still correct contact details.",
      fields: { date: "Closed bookings keep their date and time." },
      values,
    };

  const { error } = await supabase.rpc("admin_update_booking", {
    p_booking_id: id,
    p_patch: patch,
  });
  if (error) {
    const msg = error.message;
    if (msg.includes("slot_unavailable"))
      return {
        message:
          "That time overlaps another confirmed booking or a blocked period (the buffer between events is included). Please pick another time.",
        fields: { time: "That time is not free." },
        values,
      };
    if (msg.includes("booking_not_found"))
      return { message: "That booking could not be found.", values };
    if (error.code === "42501" || msg.includes("forbidden"))
      return { message: "You are not allowed to do that.", values };
    if (error.code === "23514")
      return {
        message:
          "Please keep at least one way to reach the client: Messenger link, mobile or email.",
        fields: { contact: "Add a Messenger link, mobile or email." },
        values,
      };
    console.error("admin_update_booking failed:", msg);
    return { message: "Could not save the changes. Please try again.", values };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/schedule");
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/booking");
  redirect(`/admin/bookings/${id}?updated=1`);
}