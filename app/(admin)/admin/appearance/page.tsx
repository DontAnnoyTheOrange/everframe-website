import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import { PageHeader } from "@/components/admin/ui";
import { AppearanceSettings } from "@/components/admin/AppearanceSettings";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Appearance",
  robots: { index: false, follow: false },
};

export default async function AppearancePage() {
  const { displayName } = await requireAdmin();

  return (
    <AdminShell name={displayName} current="appearance">
      <PageHeader
        eyebrow="Appearance"
        title="Appearance settings"
        description="Choose the admin interface theme: light, dark or dark blue."
      />
      <AppearanceSettings />
    </AdminShell>
  );
}
