import type { Metadata } from "next";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import Icon from "@/components/admin/Icon";
import ProjectGrid, { type GridProject } from "@/components/admin/ProjectGrid";
import { EmptyState, ErrorNote, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { getCloudinaryConfig } from "@/lib/cloudinary/server";

export const metadata: Metadata = {
  title: "Portfolio",
  robots: { index: false, follow: false },
};

export default async function AdminPortfolioPage() {
  const { supabase, displayName } = await requireAdmin();
  const [projects, images, cats] = await Promise.all([
    supabase
      .from("portfolio_projects")
      .select("id,title,slug,category_id,is_published,is_featured,shoot_date")
      .order("sort_order")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("portfolio_images")
      .select("project_id,cloudinary_public_id,width,height,is_cover,sort_order")
      .order("sort_order")
      .limit(3000),
    supabase.from("event_categories").select("id,name"),
  ]);
  const failed = projects.error ?? images.error ?? cats.error;
  if (failed) console.error("portfolio list failed:", failed.message);

  const count = new Map<string, number>();
  const cover = new Map<string, GridProject["cover"]>();
  for (const i of images.data ?? []) {
    const pid = i.project_id as string;
    count.set(pid, (count.get(pid) ?? 0) + 1);
    if (i.is_cover === true || !cover.has(pid))
      cover.set(pid, {
        publicId: i.cloudinary_public_id as string,
        width: i.width as number,
        height: i.height as number,
      });
  }
  // A cover chosen on purpose always wins over "first photo".
  for (const i of images.data ?? [])
    if (i.is_cover === true)
      cover.set(i.project_id as string, {
        publicId: i.cloudinary_public_id as string,
        width: i.width as number,
        height: i.height as number,
      });
  const catName = new Map(
    (cats.data ?? []).map((c) => [c.id as string, c.name as string]),
  );
  const list: GridProject[] = (projects.data ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    category: catName.get(p.category_id as string) ?? "",
    photos: count.get(p.id as string) ?? 0,
    published: p.is_published === true,
    featured: p.is_featured === true,
    cover: cover.get(p.id as string) ?? null,
  }));
  const cfg = getCloudinaryConfig();
  const cloud =
    cfg?.cloudName ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? "";

  return (
    <AdminShell name={displayName} current="portfolio">
      <PageHeader
        eyebrow="Workspace"
        title="Portfolio"
        description="Each project is one shoot with its photos. Only published projects appear on the public Portfolio page, in the order shown here. Featured projects are shown larger and come first. Drag a card to reorder."
        actions={
          <Link href="/admin/portfolio/new" className="a-btn a-btn-primary">
            <Icon name="plus" size={16} />
            New project
          </Link>
        }
      />
      {failed && (
        <ErrorNote>
          Could not load projects. Check your connection and refresh.
        </ErrorNote>
      )}
      {list.length === 0 && !failed ? (
        <div className="a-card">
          <EmptyState
            icon="portfolio"
            title="No projects yet"
            text="Create your first project, then upload its photographs. The first photo becomes the cover."
            href="/admin/portfolio/new"
            action="Create a project"
          />
        </div>
      ) : (
        <ProjectGrid projects={list} cloud={cloud} />
      )}
    </AdminShell>
  );
}