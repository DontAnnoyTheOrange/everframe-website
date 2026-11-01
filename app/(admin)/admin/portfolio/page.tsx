import type { Metadata } from "next";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth/dal";
import { moveProject, toggleFeatured } from "./actions";

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
    supabase.from("portfolio_images").select("project_id").limit(3000),
    supabase.from("event_categories").select("id,name"),
  ]);
  const failed = projects.error ?? images.error ?? cats.error;
  if (failed) console.error("portfolio list failed:", failed.message);

  const count = new Map<string, number>();
  for (const i of images.data ?? [])
    count.set(
      i.project_id as string,
      (count.get(i.project_id as string) ?? 0) + 1,
    );
  const catName = new Map(
    (cats.data ?? []).map((c) => [c.id as string, c.name as string]),
  );

  return (
    <AdminShell name={displayName} current="portfolio">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <Link
          href="/admin/portfolio/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          + New project
        </Link>
      </div>
      <p className="mt-2 text-sm text-neutral-600">
        Each project is one shoot with its photos. Only projects marked as shown
        appear on the public Portfolio page, in the order listed here. Featured
        projects are shown larger and come first.
      </p>
      {failed && (
        <p
          role="alert"
          className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800"
        >
          Could not load projects. Check your connection and refresh.
        </p>
      )}
      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-100 text-xs text-neutral-600 uppercase">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Photos</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3">Order</th>
            </tr>
          </thead>
          <tbody>
            {(projects.data ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  No projects yet. Create your first one.
                </td>
              </tr>
            )}
            {(projects.data ?? []).map((p, idx, all) => (
              <tr key={p.id as string} className="border-t border-neutral-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/portfolio/${p.id}`}
                    className="font-medium underline"
                  >
                    {p.title as string}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {catName.get(p.category_id as string) ?? "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  {count.get(p.id as string) ?? 0}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${p.is_published ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-700"}`}
                  >
                    {p.is_published ? "Shown" : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <form action={toggleFeatured}>
                    <input
                      type="hidden"
                      name="projectId"
                      value={p.id as string}
                    />
                    <input
                      type="hidden"
                      name="on"
                      value={p.is_featured ? "0" : "1"}
                    />
                    <button
                      aria-pressed={p.is_featured === true}
                      className={`rounded border px-2 py-1 text-xs ${p.is_featured ? "border-amber-400 bg-amber-50 text-amber-900" : "border-neutral-300 text-neutral-600 hover:bg-neutral-100"}`}
                    >
                      {p.is_featured ? "★ Featured" : "☆ Feature"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {(["up", "down"] as const).map((dir) => (
                      <form key={dir} action={moveProject}>
                        <input
                          type="hidden"
                          name="projectId"
                          value={p.id as string}
                        />
                        <input type="hidden" name="dir" value={dir} />
                        <button
                          disabled={
                            dir === "up" ? idx === 0 : idx === all.length - 1
                          }
                          aria-label={`Move ${p.title as string} ${dir === "up" ? "earlier" : "later"}`}
                          className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-30"
                        >
                          {dir === "up" ? "↑" : "↓"}
                        </button>
                      </form>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}