import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { pickDisplayName } from "@/lib/admin/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// The Data Access Layer: the ONE place that decides "is this person an administrator?".
// Every admin page and every admin Server Action calls requireAdmin() first.
// Being signed in is not enough: the person must also be listed in the admin_users table.
// (The database enforces the same rule again through Row Level Security.)
export const requireAdmin = cache(async () => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/admin/login?error=config");

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admin_users")
    .select("display_name")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!admin) redirect("/admin/login?error=not-admin");

  return {
    supabase,
    user: auth.user,
    displayName: pickDisplayName(
      auth.user.user_metadata?.display_name,
      admin.display_name,
      auth.user.email,
    ),
  };
});