"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { todayInManila } from "@/lib/booking/manila";
import { blockRange, blockSchema } from "@/lib/admin/schedule";

export type BlockState = {
  ok?: boolean;
  message?: string;
  fields?: Record<string, string>;
};

function refresh() {
  revalidatePath("/admin/schedule");
  revalidatePath("/admin");
  revalidatePath("/booking"); // the public calendar reads blocks too
}

// Blocks a period (day off, personal commitment). The database refuses it if a CONFIRMED booking is
// already in that period, and it takes the same lock as bookings so two changes cannot collide.
export async function createBlock(
  _prev: BlockState,
  formData: FormData,
): Promise<BlockState> {
  const { supabase } = await requireAdmin();
  const parsed = blockSchema.safeParse({
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
    allDay: formData.get("allDay") === "on",
    startTime: formData.get("startTime") ?? "",
    endTime: formData.get("endTime") ?? "",
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? "form");
      if (!(k in fields)) fields[k] = i.message;
    }
    return { message: "Please check the highlighted fields.", fields };
  }
  const range = blockRange(parsed.data, todayInManila());
  if (!range.ok)
    return {
      message: "Please check the highlighted fields.",
      fields: range.fields,
    };

  const { error } = await supabase.rpc("admin_create_block", {
    p_start: range.start,
    p_end: range.end,
    p_reason: parsed.data.reason || null,
  });
  if (error) {
    if (error.message.includes("conflicts_with_booking"))
      return {
        message:
          "A confirmed booking is already in that period. Move or cancel it first, then block the dates.",
      };
    if (error.message.includes("invalid_range"))
      return { message: "The end must be after the start." };
    if (error.code === "42501" || error.message.includes("forbidden"))
      return { message: "You are not allowed to do that." };
    console.error("admin_create_block failed:", error.message);
    return { message: "Could not block those dates. Please try again." };
  }
  refresh();
  return {
    ok: true,
    message: "Dates blocked. Clients can no longer pick them.",
  };
}

const deleteSchema = z.object({ blockId: z.uuid() });

// Removes a block. Row Level Security lets only administrators delete.
export async function deleteBlock(
  _prev: BlockState,
  formData: FormData,
): Promise<BlockState> {
  const { supabase } = await requireAdmin();
  const parsed = deleteSchema.safeParse({ blockId: formData.get("blockId") });
  if (!parsed.success)
    return { message: "Something went wrong. Please refresh." };
  const { error } = await supabase
    .from("availability_blocks")
    .delete()
    .eq("id", parsed.data.blockId);
  if (error) {
    console.error("delete block failed:", error.message);
    return { message: "Could not remove the block. Please try again." };
  }
  refresh();
  return { ok: true, message: "Block removed." };
}