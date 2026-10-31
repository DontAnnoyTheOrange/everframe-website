import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import AdminShell from "@/components/admin/AdminShell";
import DeleteProject from "@/components/admin/DeleteProject";
import ImageManager, { type AdminImage } from "@/components/admin/ImageManager";
import ProjectForm from "@/components/admin/ProjectForm";
import { requireAdmin } from "@/lib/auth/dal";
import { getCloudinaryConfig } from "@/lib/cloudinary/server";

export const metadata: Metadata = {
  title: "Edit project",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, displayName } = await requireAdmin();

  const [proj, imgs, cats] = await Promise.all([
    supabase
      .from("portfolio_projects")
      .select("id,title,slug,category_id,description,shoot_date,is_published")
      .eq("id", id)
      .limit(1),
    supabase
      .from("portfolio_images")
      .select("id,cloudinary_public_id,width,height,alt_text,caption,is_cover")
      .eq("project_id", id)
      .order("sort_order")
      .order("created_at")
      .limit(500),
    supabase
      .from("event_categories")
      .select("id,name,is_other,sort_order")
      .order("sort_order"),
  ]);
  const p = proj.data?.[0];
  if (!p) notFound();

  const cfg = getCloudinaryConfig();
  const images: AdminImage[] = (imgs.data ?? []).map((i) => ({
    id: i.id as string,
    publicId: i.cloudinary_public_id as string,
    width: i.width as number,
    height: i.height as number,
    alt: (i.alt_text as string) ?? "",
    caption: (i.caption as string | null) ?? "",
    isCover: i.is_cover === true,
  }));
  const categories = (cats.data ?? [])
    .filter((c) => c.is_other !== true)
    .map((c) => ({ id: c.id as string, name: c.name as string }));

  return (
    <AdminShell name={displayName} current="portfolio">
      <Link href="/admin/portfolio" className="text-sm underline">
        ← Back to portfolio
      </Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{p.title as string}</h1>
        {p.is_published ? (
          <Link
            href={`/portfolio/${p.slug as string}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-700 underline"
          >
            View on the site ↗
          </Link>
        ) : (
          <span className="text-sm text-neutral-500">
            Hidden from the public site
          </span>
        )}
      </div>
      {error === "delete" && (
        <p
          role="alert"
          className="mb-4 rounded bg-red-50 p-3 text-sm text-red-800"
        >
          Could not delete the project. Please try again.
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col gap-6">
          <ProjectForm
            categories={categories}
            initial={{
              id: p.id as string,
              title: p.title as string,
              slug: p.slug as string,
              categoryId: p.category_id as string,
              description: (p.description as string | null) ?? "",
              shootDate: (p.shoot_date as string | null) ?? "",
              isPublished: p.is_published === true,
            }}
          />
          <DeleteProject projectId={p.id as string} />
        </div>
        <ImageManager
          projectId={p.id as string}
          cloud={
            cfg?.cloudName ??
            process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ??
            ""
          }
          uploadReady={cfg !== null}
          images={images}
        />
      </div>
    </AdminShell>
  );
}