"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth/safeNext";
import { createLimiter } from "@/lib/booking/rateLimit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { message?: string };

// 8 sign-in attempts per visitor per 10 minutes (slows down password guessing).
const limiter = createLimiter(8, 10 * 60 * 1000);

const schema = z.object({
  email: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(200),
  next: z.string().max(300).optional(),
});

// One message for every failure, so nobody can use this form to find out which emails exist.
const WRONG = "Email or password is incorrect.";

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success)
    return { message: "Please enter your email and password." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!limiter.allow(ip)) {
    return {
      message: "Too many attempts. Please wait a few minutes and try again.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase)
    return {
      message: "Sign-in is not set up yet. Check your .env.local file.",
    };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) return { message: WRONG };

  // Signed in is not the same as administrator. Check the admin list too.
  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { message: WRONG };
  }

  redirect(safeNext(parsed.data.next));
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/admin/login");
}