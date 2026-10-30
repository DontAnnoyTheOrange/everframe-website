"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BOOKING_MAX_DAYS_AHEAD,
  bookingInputSchema,
  fieldErrors,
  normalizePhone,
} from "@/lib/booking/bookingSchema";
import { addDays, dayKey, manilaIso } from "@/lib/booking/manila";
import { parseMessengerLink } from "@/lib/booking/messenger";
import { createLimiter } from "@/lib/booking/rateLimit";

export type BookingResult =
  | {
      ok: true;
      reference: string;
      total: number | null;
      customQuote: boolean;
    }
  | {
      ok: false;
      message: string;
      fields?: Record<string, string>;
      // true when the chosen time was taken by someone else: the page should refresh its calendar
      slotTaken?: boolean;
    };

// 5 requests per visitor per 10 minutes.
const limiter = createLimiter(5, 10 * 60 * 1000);

async function visitorKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

// Saves a booking REQUEST. It stays "pending" until the photographer confirms it, and a pending
// request does not block the calendar. Checks run in this order: shape, bot trap, rate limit, date,
// then the database, which re-checks the price, the hours, the event type and the schedule.
export async function submitBooking(raw: unknown): Promise<BookingResult> {
  const parsed = bookingInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fields: fieldErrors(parsed.error),
    };
  }
  const v = parsed.data;

  // Bots fill the hidden "website" field. Pretend it worked so they do not retry.
  if (v.website.trim() !== "") {
    return { ok: true, reference: "RECEIVED", total: null, customQuote: false };
  }

  if (!limiter.allow(await visitorKey())) {
    return {
      ok: false,
      message:
        "You have sent several requests in a short time. Please wait a few minutes and try again.",
    };
  }

  // The event must be at least tomorrow and within a year (Manila time).
  const today = dayKey(Date.now());
  if (v.date <= today) {
    return {
      ok: false,
      message: "Please choose a date from tomorrow onward.",
      fields: { date: "Please choose a date from tomorrow onward." },
    };
  }
  if (v.date > addDays(today, BOOKING_MAX_DAYS_AHEAD)) {
    return {
      ok: false,
      message: "Please choose a date within the next 12 months.",
      fields: { date: "Please choose a date within the next 12 months." },
    };
  }

  // The schema already proved the link is valid; save the cleaned-up version (https://m.me/...).
  const messenger = parseMessengerLink(v.messenger);
  const messengerUrl = messenger.ok ? messenger.url : null;

  const db = createAdminClient();
  if (!db) {
    console.error("submitBooking: SUPABASE_SERVICE_ROLE_KEY is not set");
    return {
      ok: false,
      message:
        "Booking is not available right now. Please contact us directly.",
    };
  }

  const { data, error } = await db.rpc("create_booking_request", {
    p_category_id: v.categoryId,
    p_package_id: v.packageId,
    p_hours: v.hours,
    p_addon_ids: v.addonIds,
    p_starts_at: manilaIso(v.date, v.time),
    p_client_name: v.name,
    p_client_email: v.email || null,
    p_client_phone: v.phone ? normalizePhone(v.phone) : null,
    p_client_messenger: messengerUrl,
    p_venue: v.venue || null,
    p_message: v.message || null,
    p_outside_base: v.outsideBase,
    p_event_type_other: v.eventTypeOther || null,
  });

  if (error) {
    const m = error.message;
    if (m.includes("slot_unavailable")) {
      return {
        ok: false,
        slotTaken: true,
        message:
          "Sorry, that time was just taken. Please pick another time or date.",
      };
    }
    if (m.includes("event_type_other_required")) {
      return {
        ok: false,
        message: "Please tell us what kind of event this is.",
        fields: {
          eventTypeOther:
            "Please tell us what kind of event this is (2 to 80 characters).",
        },
      };
    }
    if (m.includes("package_hours_exceeded")) {
      return {
        ok: false,
        message:
          "That package does not cover this many hours. Please go back and choose the next package.",
      };
    }
    if (m.includes("date_in_past")) {
      return { ok: false, message: "Please choose a date in the future." };
    }
    console.error("create_booking_request failed:", m);
    return {
      ok: false,
      message: "We could not save your request. Please try again in a moment.",
    };
  }

  const r = data as {
    reference_code: string;
    total_price: number | null;
    custom_quote: boolean;
  };
  return {
    ok: true,
    reference: r.reference_code,
    total: r.total_price,
    customQuote: r.custom_quote,
  };
}