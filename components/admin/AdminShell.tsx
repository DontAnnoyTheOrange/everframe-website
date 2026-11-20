"use client";

import "@/components/admin/admin.css";
import AdminNav, { type NavKey } from "@/components/admin/AdminNav";
import Icon from "@/components/admin/Icon";
import { logout } from "@/app/(admin)/admin/login/actions";
import { formatManilaDate, todayInManila } from "@/lib/booking/manila";
import { ThemeProvider } from "@/components/admin/ThemeProvider";

// The light-theme frame around every admin page: sidebar (menu on phones), a slim top row with
// today's date and the page itself. The "+ New booking" shortcut was removed as redundant.
// Every page passes `name` and `current`, exactly as before, so no page needed a new structure.
export default function AdminShell({
  name,
  current,
  children,
}: {
  name: string;
  current: NavKey;
  children: React.ReactNode;
}) {
  const today = formatManilaDate(`${todayInManila()}T12:00:00+08:00`);
  return (
    <ThemeProvider>
      <div className="admin-root min-h-screen">
        <AdminNav
          current={current}
          name={name}
          signOut={
            <form action={logout}>
              <button
                type="submit"
                className="a-nav-link w-full"
                aria-label="Sign out"
                title="Sign out"
              >
                <Icon name="signout" />
                <span className="a-nav-label">Sign out</span>
              </button>
            </form>
          }
        >
          <div className="mx-auto w-full max-w-[84rem] px-4 pb-16 sm:px-6 lg:px-10">
            <div className="flex flex-wrap items-center justify-between gap-3 py-5">
              <p className="flex items-center gap-2 text-sm text-neutral-500">
                <Icon name="calendar" size={16} />
                <span>{today}</span>
                <span className="text-neutral-400">· Manila</span>
              </p>
            </div>
            <main id="admin-main">{children}</main>
          </div>
        </AdminNav>
      </div>
    </ThemeProvider>
  );
}
