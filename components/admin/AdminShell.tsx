import Link from "next/link";
import { logout } from "@/app/(admin)/admin/login/actions";

// The light-theme frame around every admin page: top bar, menu, who is signed in, sign out.
export default function AdminShell({
  name,
  current,
  children,
}: {
  name: string;
  current: "dashboard" | "bookings" | "schedule" | "portfolio";
  children: React.ReactNode;
}) {
  const link = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm ${active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-200"}`;
  return (
    <div
      style={{ colorScheme: "light" }}
      className="min-h-screen bg-neutral-50 text-neutral-900"
    >
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <span className="font-semibold">Everframe Admin</span>
          <nav aria-label="Admin" className="flex gap-1">
            <Link href="/admin" className={link(current === "dashboard")}>
              Dashboard
            </Link>
            <Link
              href="/admin/bookings"
              className={link(current === "bookings")}
            >
              Bookings
            </Link>
            <Link
              href="/admin/schedule"
              className={link(current === "schedule")}
            >
              Schedule
            </Link>
            <Link
              href="/admin/portfolio"
              className={link(current === "portfolio")}
            >
              Portfolio
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-neutral-600">
            <span>{name}</span>
            <form action={logout}>
              <button className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}