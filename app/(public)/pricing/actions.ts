"use server";

import { createPublicClient } from "@/lib/supabase/public";
import { quoteInputSchema } from "@/lib/booking/quoteSchema";
import type { Quote } from "@/lib/types/db";

export type QuoteResult =
  { ok: true; quote: Quote } | { ok: false; message: string };

// Asks the database for the price. The browser never decides the total.
export async function getQuote(raw: unknown): Promise<QuoteResult> {
  const parsed = quoteInputSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, message: "Please check your selection and try again." };

  const db = createPublicClient();
  if (!db) return { ok: false, message: "Pricing is not available right now." };

  const { packageId, hours, addonIds, outsideBase } = parsed.data;
  const { data, error } = await db.rpc("quote_booking", {
    p_package_id: packageId,
    p_hours: hours,
    p_addon_ids: addonIds,
    p_outside_base: outsideBase,
  });

  if (error) {
    console.error("quote_booking failed:", error.message);
    return {
      ok: false,
      message: "We could not calculate that price. Please try again.",
    };
  }
  return { ok: true, quote: data as Quote };
}