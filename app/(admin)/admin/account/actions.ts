"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  emailSchema,
  fieldErrors,
  nameSchema,
  passwordSchema,
} from "@/lib/admin/account";
import { THEME_COOKIE, themeFor } from "@/lib/admin/theme";
import { requireAdmin } from "@/lib/auth/dal";
import { createLimiter } from "@/lib/booking/rateLimit";
import { getSupabasePublicEnv } from "@/lib/env";

export type AccountState = {
  ok?: boolean;
  message?: string;
  fields?: Record<string, string>;
  nonce?: string;
};

// Name: kept in the sign-in account itself, so nothing in the database changes.
export async function saveName(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const { supabase } = await requireAdmin();
  const parsed = nameSchema.safeParse({ name: String(formData.get("name") ?? "") });
  if (!parsed.success)
    return { message: "Please check the highlighted field.", fields: fieldErrors(parsed.error) };
  const { error } = await supabase.auth.updateUser({
    data: { display_name: parsed.data.name },
  });
  if (error) {
    console.error("save name failed:", error.message);
    return { message: "Could not save your name. Please try again." };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Name saved.", nonce: crypto.randomUUID() };
}

// Email: Supabase sends a confirmation link; the sign-in email only changes after it is opened.
export async function changeEmail(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const { supabase, user } = await requireAdmin();
  const parsed = emailSchema.safeParse({ email: String(formData.get("email") ?? "") });
  if (!parsed.success)
    return { message: "Please check the highlighted field.", fields: fieldErrors(parsed.error) };
  if (parsed.data.email === user.email?.toLowerCase())
    return { message: "That is already your sign-in email.", fields: { email: "Enter a different address." } };
  const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (error) {
    console.error("change email failed:", error.message);
    return { message: "Could not start the email change. Please check the address and try again." };
  }
  return {
    ok: true,
    message:
      "Almost done. We sent a confirmation link to the new address (and possibly the old one). Your sign-in email changes after you open it.",
    nonce: crypto.randomUUID(),
  };
}

// 5 password attempts per person per 15 minutes (stops someone with a left-open screen guessing the password).
const limiter = createLimiter(5, 15 * 60 * 1000);

// Password: the current password is checked first, using a separate throw-away client so the session is untouched.
export async function changePassword(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const { supabase, user } = await requireAdmin();
  const parsed = passwordSchema.safeParse({
    current: String(formData.get("current") ?? ""),
    next: String(formData.get("next") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success)
    return { message: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
  if (!limiter.allow(user.id))
    return { message: "Too many attempts. Please wait a few minutes and try again." };

  const env = getSupabasePublicEnv();
  if (!env || !user.email) return { message: "Password change is not available right now." };
  const checker = createClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const check = await checker.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (check.error)
    return { message: "Please check the highlighted field.", fields: { current: "That is not your current password." } };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.next });
  if (error) {
    console.error("change password failed:", error.message);
    return { message: "Could not change the password. Please try a different one." };
  }
  return { ok: true, message: "Password changed. Use the new one next time you sign in.", nonce: crypto.randomUUID() };
}

// Appearance: remembered on this browser for a year.
export async function setTheme(value: string): Promise<void> {
  await requireAdmin();
  (await cookies()).set(THEME_COOKIE, themeFor(value), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
}