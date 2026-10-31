// Rules for the admin schedule: blocking dates and adding a booking by hand (Messenger or phone).
// Plain functions and Zod rules, so they can be tested without a database or a browser.
import { z } from "zod";
import { parseMessengerLink } from "../booking/messenger";
import { addDays, isRealDate, manilaIso, manilaMs } from "../booking/manila";
import { normalizePhone } from "../booking/bookingSchema";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
export const BLOCK_MAX_DAYS = 366;

// ---------- Blocking dates ----------

export const blockSchema = z.object({
  startDate: z
    .string()
    .refine(isRealDate, { message: "Please pick the first day." }),
  endDate: z
    .string()
    .refine(isRealDate, { message: "Please pick the last day." }),
  allDay: z.boolean(),
  startTime: z.string(),
  endTime: z.string(),
  reason: z
    .string()
    .trim()
    .max(200, "Please keep the reason under 200 characters."),
});

export type BlockInput = z.infer<typeof blockSchema>;

export type BlockRange =
  | { ok: true; start: string; end: string }
  | { ok: false; fields: Record<string, string> };

/**
 * Turns the form into the exact start and end moments (Manila time, +08:00).
 * "All day" means from 12:00 AM on the first day to 12:00 AM after the last day.
 */
export function blockRange(v: BlockInput, today: string): BlockRange {
  const fields: Record<string, string> = {};
  if (v.endDate < v.startDate)
    fields.endDate = "The last day cannot be before the first day.";
  else if (v.endDate < today)
    fields.endDate = "That period is already over. Please pick today or later.";
  else if (
    manilaMs(addDays(v.endDate, 1), "00:00") - manilaMs(v.startDate, "00:00") >
    BLOCK_MAX_DAYS * 86400000
  )
    fields.endDate = `Please block at most ${BLOCK_MAX_DAYS} days at a time.`;

  if (v.allDay) {
    if (Object.keys(fields).length) return { ok: false, fields };
    return {
      ok: true,
      start: manilaIso(v.startDate, "00:00"),
      end: manilaIso(addDays(v.endDate, 1), "00:00"),
    };
  }
  if (!CLOCK.test(v.startTime)) fields.startTime = "Please pick a start time.";
  if (!CLOCK.test(v.endTime)) fields.endTime = "Please pick an end time.";
  if (Object.keys(fields).length) return { ok: false, fields };
  const start = manilaMs(v.startDate, v.startTime);
  const end = manilaMs(v.endDate, v.endTime);
  if (end <= start)
    return {
      ok: false,
      fields: { endTime: "The end must be after the start." },
    };
  return {
    ok: true,
    start: manilaIso(v.startDate, v.startTime),
    end: manilaIso(v.endDate, v.endTime),
  };
}

// ---------- Manual booking ----------

export const MANUAL_SOURCES = ["messenger", "phone", "other"] as const;

export const manualBookingSchema = z.object({
  categoryId: z.uuid({ error: "Please choose the event type." }),
  packageId: z.uuid({ error: "Please choose a package." }),
  hours: z
    .number({ error: "Please enter the hours." })
    .int("Whole hours only.")
    .min(1, "At least 1 hour.")
    .max(24, "At most 24 hours."),
  addonIds: z.array(z.uuid()).max(10),
  outsideBase: z.boolean(),
  eventTypeOther: z
    .string()
    .trim()
    .max(80, "Please keep it under 80 characters."),
  date: z
    .string()
    .refine(isRealDate, { message: "Please pick the event date." }),
  time: z.string().regex(CLOCK, "Please pick a start time."),
  name: z
    .string()
    .trim()
    .min(2, "Please enter the client's name.")
    .max(120, "That name is too long."),
  email: z
    .string()
    .trim()
    .max(254)
    .refine((v) => v === "" || EMAIL.test(v), {
      message: "That email does not look right.",
    }),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === "" || /^\+?\d{7,15}$/.test(normalizePhone(v)), {
      message: "Please enter a phone number with 7 to 15 digits.",
    }),
  messenger: z
    .string()
    .trim()
    .max(200)
    .superRefine((v, ctx) => {
      if (v === "") return;
      const m = parseMessengerLink(v);
      if (!m.ok) ctx.addIssue({ code: "custom", message: m.message });
    }),
  venue: z
    .string()
    .trim()
    .max(200, "Please keep the venue under 200 characters."),
  source: z.enum(MANUAL_SOURCES, {
    error: "Please choose where this booking came from.",
  }),
  // Optional: leave empty to use the package price. A number overrides it (for example a discount).
  totalOverride: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (/^\d{1,7}(\.\d{1,2})?$/.test(v) && Number(v) >= 0),
      {
        message:
          "Enter a price like 5000 (or leave empty to use the package price).",
      },
    ),
  notes: z
    .string()
    .trim()
    .max(2000, "Please keep notes under 2000 characters."),
});

export type ManualBookingInput = z.infer<typeof manualBookingSchema>;

export type ManualCheck =
  | { ok: true; data: ManualBookingInput }
  | { ok: false; fields: Record<string, string> };

/** All field problems at once, plus "at least one way to contact the client". */
export function checkManualBooking(raw: unknown): ManualCheck {
  const parsed = manualBookingSchema.safeParse(raw);
  const fields: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!(key in fields)) fields[key] = issue.message;
    }
  }
  const r = (raw ?? {}) as Record<string, unknown>;
  const has = (k: string) =>
    typeof r[k] === "string" && (r[k] as string).trim() !== "";
  if (!has("email") && !has("phone") && !has("messenger"))
    fields.contact =
      "Please add at least one way to reach the client: Messenger link, mobile or email.";
  if (Object.keys(fields).length > 0 || !parsed.success)
    return { ok: false, fields };
  return { ok: true, data: parsed.data };
}