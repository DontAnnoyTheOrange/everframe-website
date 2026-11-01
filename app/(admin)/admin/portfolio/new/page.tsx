import type { Metadata } from "next";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import ProjectForm from "@/components/admin/ProjectForm";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "New project",
  robots: { index: false, follow: false },
};

export default async function NewProjectPage() {
  const { supabase, displayName } = await requireAdmin();
  const { data } = await supabase
    .from("event_categories")
    .select("id,name,is_other,sort_order")
    .order("sort_order");
  const categories = (data ?? [])
    .filter((c) => c.is_other !== true)
    .map((c) => ({ id: c.id as string, name: c.name as string }));
  return (
    <AdminShell name={displayName} current="portfolio">
      <Link href="/admin/portfolio" className="text-sm underline">
        ← Back to portfolio
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">New project</h1>
      <ProjectForm
        categories={categories}
        initial={{
          title: "",
          slug: "",
          categoryId: "",
          description: "",
          shootDate: "",
          videoUrl: "",
          isPublished: false,
          isFeatured: false,
        }}
      />
    </AdminShell>
  );
}