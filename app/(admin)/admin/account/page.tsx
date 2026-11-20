import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { EmailForm, NameForm, PasswordForm } from "@/components/admin/AccountForms";
import ThemePicker from "@/components/admin/ThemePicker";
import { Card, PageHeader } from "@/components/admin/ui";
import { THEME_COOKIE, themeFor } from "@/lib/admin/theme";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { user, displayName } = await requireAdmin();
  const appearance = (await searchParams).tab === "appearance";
  const theme = themeFor((await cookies()).get(THEME_COOKIE)?.value);
  const rawName = user.user_metadata?.display_name;

  return (
    <AdminShell name={displayName} current={appearance ? "appearance" : "account"}>
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Your name and sign-in details, and how the admin looks."
      />
      <nav aria-label="Settings sections" className="mb-6 flex gap-2">
        <Link href="/admin/account" aria-current={!appearance ? "page" : undefined} className="a-chip">
          Account
        </Link>
        <Link href="/admin/account?tab=appearance" aria-current={appearance ? "page" : undefined} className="a-chip">
          Appearance
        </Link>
      </nav>

      {appearance ? (
        <Card title="Appearance">
          <p className="mb-4 text-sm text-neutral-500">
            Choose how the admin looks. This only changes the admin, never the public website.
          </p>
          <ThemePicker initial={theme} />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Your name">
            <NameForm initial={typeof rawName === "string" ? rawName : displayName === user.email ? "" : displayName} />
          </Card>
          <Card title="Sign-in email">
            <EmailForm current={user.email ?? ""} />
          </Card>
          <Card title="Password" className="lg:col-span-2">
            <PasswordForm />
          </Card>
        </div>
      )}
    </AdminShell>
  );
}