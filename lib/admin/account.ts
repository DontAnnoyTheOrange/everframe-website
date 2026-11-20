import { z } from "zod";

// Rules for the account forms, kept apart from the Server Actions so they can be tested.
export const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name (at least 2 characters).")
    .max(60, "Please keep your name under 60 characters."),
});

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "That email address is too long.")
    .pipe(z.email("Please enter a valid email address.")),
});

export const MIN_PASSWORD = 10;

export const passwordSchema = z
  .object({
    current: z.string().min(1, "Please enter your current password.").max(200),
    next: z
      .string()
      .min(MIN_PASSWORD, `Use at least ${MIN_PASSWORD} characters.`)
      .max(200, "Please keep the password under 200 characters."),
    confirm: z.string().max(200),
  })
  .superRefine((v, ctx) => {
    if (v.next !== v.confirm)
      ctx.addIssue({
        code: "custom",
        path: ["confirm"],
        message: "The two new passwords do not match.",
      });
    if (v.next === v.current && v.next.length > 0)
      ctx.addIssue({
        code: "custom",
        path: ["next"],
        message: "Choose a password that is different from the current one.",
      });
  });

/** The first message for each field, for showing under the boxes. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = String(i.path[0] ?? "form");
    if (!(k in out)) out[k] = i.message;
  }
  return out;
}

/** The name to show in the admin: the one the person chose, else the one on the admin list, else the email. */
export function pickDisplayName(
  chosen: unknown,
  listed: unknown,
  email: string | undefined,
): string {
  for (const v of [chosen, listed]) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return email ?? "Admin";
}