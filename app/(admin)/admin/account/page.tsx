import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import { PageHeader } from "@/components/admin/ui";
import { AccountForm } from "@/components/admin/AccountForm";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Admin account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const { user, displayName } = await requireAdmin();

  return (
    <AdminShell name={displayName} current="account">
      <PageHeader
        eyebrow="Account"
        title="Admin account"
        description="Set your own name, email and password used to sign in and shown in the admin."
      />
      <AccountForm
        user={user}
        defaultName={displayName}
      />
    </AdminShell>
  );
}
