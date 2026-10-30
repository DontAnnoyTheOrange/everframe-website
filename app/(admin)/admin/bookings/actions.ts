"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { STATUSES } from "@/lib/booking/status";

export type ActionState = { ok?: boolean; message?: string };

const statusSchema = z.object({
  bookingId: z.uuid(),
  status: z.enum(STATUSES),
  note: z
    .string()
    .trim()
    .max(500, "Please keep the note under 500 characters."),
});

const notesSchema = z.object({
  bookingId: z.uuid(),
  notes: z
    .string()
    .trim()
    .max(4000, "Please keep notes under 4000 characters."),
});

function refresh(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);
}

// Moves a booking to a new status. The database function checks that the move is allowed and, for
// "confirmed", that the time is still free, all under a lock so two admins cannot double-book.
export async function setBookingStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = statusSchema.safeParse({
    bookingId: formData.get("bookingId"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return {
      message:
        parsed.error.issues[0]?.message ??
        "Please check the form and try again.",
    };
  }
  const { bookingId, status, note } = parsed.data;

  const { data, error } = await supabase.rpc("admin_set_booking_status", {
    p_booking_id: bookingId,
    p_new_status: status,
    p_note: note || null,
  });

  if (error) {
    const m = error.message;
    if (m.includes("slot_unavailable"))
      return {
        message:
          "That time overlaps another confirmed booking or a blocked time, so it cannot be confirmed.",
      };
    if (m.includes("invalid_transition"))
      return {
        message:
          "That change is not allowed from the booking's current status. Refresh the page.",
      };
    if (m.includes("booking_not_found"))
      return { message: "This booking no longer exists." };
    if (m.includes("forbidden"))
      return { message: "You do not have permission to do that." };
    console.error("admin_set_booking_status failed:", m);
    return { message: "Something went wrong. Please try again." };
  }

  refresh(bookingId);
  const unchanged = (data as { unchanged?: boolean } | null)?.unchanged;
  return {
    ok: true,
    message: unchanged
      ? "Nothing changed: it already had that status."
      : "Status updated.",
  };
}

// Saves the private notes (the client never sees these).
export async function saveNotes(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = notesSchema.safeParse({
    bookingId: formData.get("bookingId"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return {
      message:
        parsed.error.issues[0]?.message ??
        "Please check the form and try again.",
    };
  }
  const { error } = await supabase.rpc("admin_update_booking", {
    p_booking_id: parsed.data.bookingId,
    p_patch: { internal_notes: parsed.data.notes },
  });
  if (error) {
    console.error("admin_update_booking failed:", error.message);
    return { message: "Could not save the notes. Please try again." };
  }
  refresh(parsed.data.bookingId);
  return { ok: true, message: "Notes saved." };
}