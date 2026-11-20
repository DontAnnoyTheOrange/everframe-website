"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";

export type AccountState = {
  ok?: boolean;
  message?: string;
  fields?: Record<string, string>;
};

const updateSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required.").max(100),
  email: z.string().trim().email("Enter a valid email address."),
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters.").max(200).optional(),
});

export async function updateAccount(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const { supabase, user } = await requireAdmin();
  const parsed = updateSchema.safeParse({
    displayName: String(formData.get("displayName") ?? ""),
    email: String(formData.get("email") ?? ""),
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
  });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0]);
      if (!(k in fields)) fields[k] = i.message;
    }
    return { message: "Please check the highlighted fields.", fields };
  }

  // Re-authenticate with the current password before changing sensitive data.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password: parsed.data.currentPassword,
  });
  if (signInError) {
    return {
      message: "Current password is incorrect.",
      fields: { currentPassword: "Current password is incorrect." },
    };
  }

  const results: Promise<{ error: unknown } | null>[] = [];

  // Update display name in admin_users.
  results.push(
    (async () => {
      const { error } = await supabase
        .from("admin_users")
        .update({ display_name: parsed.data.displayName })
        .eq("user_id", user.id);
      return { error };
    })(),
  );

  // Update email if it changed.
  if (parsed.data.email !== user.email) {
    results.push(supabase.auth.updateUser({ email: parsed.data.email }));
  }

  // Update password if provided.
  if (parsed.data.newPassword) {
    results.push(supabase.auth.updateUser({ password: parsed.data.newPassword }));
  }

  const outcomes = await Promise.all(results);
  if (outcomes.some((r) => r && r.error)) {
    const err = outcomes.find((r) => r && r.error);
    console.error("update account failed:", err?.error);
    return { message: "Some changes could not be saved. Please try again." };
  }

  return { ok: true, message: "Account updated." };
}
