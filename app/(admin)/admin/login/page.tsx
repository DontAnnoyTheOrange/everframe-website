import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import "@/components/admin/admin.css";
import LoginForm from "@/components/admin/LoginForm";
import { THEME_COOKIE, themeFor } from "@/lib/admin/theme";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const theme = themeFor((await cookies()).get(THEME_COOKIE)?.value);

  // Already an administrator? Go straight to the dashboard.
  const supabase = await createSupabaseServerClient();
  let signedInEmail: string | null = null;
  if (supabase) {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data: admin } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (admin) redirect("/admin");
      signedInEmail = auth.user.email ?? "this account";
    }
  }

  return (
    <main
      data-theme={theme}
      className="admin-root flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-neutral-900"
    >
      <div className="a-card w-full max-w-sm p-8">
        <p className="a-eyebrow">Everframe</p>
        <h1 className="mt-1 text-2xl font-semibold">Admin sign in</h1>

        {error === "config" && (
          <p
            role="alert"
            className="mt-4 rounded bg-amber-50 p-3 text-sm text-amber-900"
          >
            Sign-in is not set up yet. Check the Supabase values in your
            .env.local file.
          </p>
        )}
        {signedInEmail && (
          <div
            role="alert"
            className="mt-4 rounded bg-amber-50 p-3 text-sm text-amber-900"
          >
            <p>
              You are signed in as {signedInEmail}, but this account is not an
              administrator.
            </p>
            <form action={logout} className="mt-2">
              <button className="underline">Sign out</button>
            </form>
          </div>
        )}

        <LoginForm next={next ?? ""} />
      </div>
    </main>
  );
}