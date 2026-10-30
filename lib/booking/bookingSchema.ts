import { z } from "zod";
import { parseMessengerLink } from "./messenger";
import { isRealDate } from "./manila";
import { venueSchema } from "./venue";

// What the booking form sends to the server. The server checks it again, so editing the page
// in the browser cannot slip bad data through. Prices are NOT sent: the database works them out.

export const BOOKING_MAX_DAYS_AHEAD = 365;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/; // same rule as the database

/** "0917 123 4567" and "+63 (917) 123-4567" both become digits (keeping a leading +). */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}

// Every rule sits on its own field (not in one combined check at the end), so a bad email, a bad
// mobile number and an empty venue are all reported together instead of one after the other.
export const bookingInputSchema = z.object({
  packageId: z.uuid(),
  hours: z.number().int().min(1).max(24),
  addonIds: z.array(z.uuid()).max(10),
  outsideBase: z.boolean(),
  categoryId: z.uuid(),
  eventTypeOther: z.string().max(200),
  date: z
    .string()
    .refine(isRealDate, { message: "Please pick a date on the calendar." }),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):(00|30)$/, "Please pick a start time."),
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(120, "That name is too long."),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email.")
    .max(254, "That email is too long.")
    .regex(EMAIL, "That email does not look right."),
  phone: z
    .string()
    .trim()
    .min(1, "Please enter your mobile number.")
    .max(30, "That phone number is too long.")
    .refine((v) => /^\+?\d{7,15}$/.test(normalizePhone(v)), {
      message: "Please enter a phone number with 7 to 15 digits.",
    }),
  // A Messenger LINK is required, so the admin can click it and land in the client's chat.
  messenger: z
    .string()
    .trim()
    .max(200, "That link is too long.")
    .superRefine((v, ctx) => {
      const m = parseMessengerLink(v);
      if (!m.ok) ctx.addIssue({ code: "custom", message: m.message });
    }),
  venue: venueSchema,
  message: z
    .string()
    .trim()
    .max(2000, "Please keep your message under 2000 characters."),
  website: z.string().max(200), // hidden trap field for bots; real people leave it empty
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

/** Turns Zod's issue list into one message per field name. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}