import "@/components/admin/admin.css";
import { cookies } from "next/headers";
import { THEME_COOKIE, themeFor } from "@/lib/admin/theme";
import { Skeleton } from "@/components/admin/ui";

// Shown while any admin page loads: the same layout shape as the real pages, so nothing jumps.
export default async function AdminLoading() {
  const theme = themeFor((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <div className="admin-root min-h-screen" data-theme={theme} role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="mx-auto max-w-[84rem] px-4 py-10 sm:px-6 lg:px-10">
        <Skeleton className="mb-3 h-4 w-32" />
        <Skeleton className="mb-8 h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    </div>
  );
}