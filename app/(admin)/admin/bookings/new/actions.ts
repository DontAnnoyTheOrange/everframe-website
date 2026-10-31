"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { normalizePhone } from "@/lib/booking/bookingSchema";
import { manilaIso } from "@/lib/booking/manila";
import { parseMessengerLink } from "@/lib/booking/messenger";
import { checkManualBooking } from "@/lib/admin/schedule";

export type ManualState = {
  ok?: boolean;
  message?: string;
  fields?: Record<string, string>;
  // What was typed, sent back so the form is not emptied when something needs fixing.
  values?: Record<string, string>;
  // Changes on every answer, so the form can start fresh with the typed values put back.
  nonce?: string;
};

// Adds a booking by hand (client booked through Messenger or phone). It is saved as CONFIRMED and goes
// through the same database rules as website bookings: the time must be free, the price comes from
// the package, and the buffer between events is respected.
export async function createManualBooking(
  prev: ManualState,
  formData: FormData,
): Promise<ManualState> {
  const result = await saveManualBooking(prev, formData);
  return result.values ? { ...result, nonce: crypto.randomUUID() } : result;
}

async function saveManualBooking(
  _prev: ManualState,
  formData: FormData,
): Promise<ManualState> {
  const { supabase } = await requireAdmin();
  const s = (k: string) => String(formData.get(k) ?? "");
  const values: Record<string, string> = {};
  for (const k of [
    "categoryId",
    "packageId",
    "hours",
    "eventTypeOther",
    "date",
    "time",
    "name",
    "email",
    "phone",
    "messenger",
    "venue",
    "source",
    "totalOverride",
    "notes",
  ])
    values[k] = s(k);
  values.addonIds = formData.getAll("addonIds").map(String).join(",");
  values.outsideBase = formData.get("outsideBase") === "on" ? "on" : "";
  const hours = s("hours").trim() === "" ? NaN : Number(s("hours"));
  const checked = checkManualBooking({
    categoryId: s("categoryId"),
    packageId: s("packageId"),
    hours: Number.isFinite(hours) ? hours : undefined,
    addonIds: formData.getAll("addonIds").map(String),
    outsideBase: formData.get("outsideBase") === "on",
    eventTypeOther: s("eventTypeOther"),
    date: s("date"),
    time: s("time"),
    name: s("name"),
    email: s("email"),
    phone: s("phone"),
    messenger: s("messenger"),
    venue: s("venue"),
    source: s("source"),
    totalOverride: s("totalOverride"),
    notes: s("notes"),
  });
  if (!checked.ok)
    return {
      message: "Please check the highlighted fields.",
      fields: checked.fields,
      values,
    };
  const v = checked.data;

  const messenger = v.messenger ? parseMessengerLink(v.messenger) : null;
  const { data, error } = await supabase.rpc("admin_create_booking", {
    p_category_id: v.categoryId,
    p_package_id: v.packageId,
    p_starts_at: manilaIso(v.date, v.time),
    p_hours: v.hours,
    p_client_name: v.name,
    p_client_email: v.email || null,
    p_client_phone: v.phone ? normalizePhone(v.phone) : null,
    p_client_messenger: messenger && messenger.ok ? messenger.url : null,
    p_venue: v.venue || null,
    p_source: v.source,
    p_total_price: v.totalOverride === "" ? null : Number(v.totalOverride),
    p_notes: v.notes || null,
    p_addon_ids: v.addonIds,
    p_outside_base: v.outsideBase,
    p_event_type_other: v.eventTypeOther || null,
  });

  if (error) {
    const m = error.message;
    if (m.includes("slot_unavailable"))
      return {
        message:
          "That time overlaps another confirmed booking or a blocked period (the buffer between events is included). Please pick another time.",
        fields: { time: "That time is not free." },
        values,
      };
    if (m.includes("event_type_other_required"))
      return {
        message: "Please tell us what kind of event this is.",
        fields: {
          eventTypeOther:
            "Please describe the event type (2 to 80 characters).",
        },
        values,
      };
    if (m.includes("package_hours_exceeded"))
      return {
        message:
          "That package does not cover this many hours. Please choose the next package.",
        fields: { hours: "Too many hours for this package." },
        values,
      };
    if (error.code === "42501" || m.includes("forbidden"))
      return { message: "You are not allowed to do that.", values };
    console.error("admin_create_booking failed:", m);
    return { message: "Could not save the booking. Please try again.", values };
  }

  const id = (data as { id?: string } | null)?.id;
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/schedule");
  revalidatePath("/booking");
  if (id) redirect(`/admin/bookings/${id}`);
  return { ok: true, message: "Booking saved." };
}