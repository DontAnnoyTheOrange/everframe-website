"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon, { type IconName } from "@/components/admin/Icon";

export type NavKey =
  | "dashboard"
  | "bookings"
  | "schedule"
  | "portfolio"
  | "settings"
  | "reviews";

const GROUPS: {
  label: string;
  items: { key: NavKey; label: string; href: string; icon: IconName }[];
}[] = [
  {
    label: "Workspace",
    items: [
      { key: "dashboard", label: "Overview", href: "/admin", icon: "overview" },
      { key: "bookings", label: "Bookings", href: "/admin/bookings", icon: "bookings" },
      { key: "schedule", label: "Calendar", href: "/admin/schedule", icon: "calendar" },
      { key: "portfolio", label: "Portfolio", href: "/admin/portfolio", icon: "portfolio" },
    ],
  },
  {
    label: "Website management",
    items: [
      { key: "settings", label: "Website content", href: "/admin/settings", icon: "content" },
      { key: "reviews", label: "Client reviews", href: "/admin/settings?tab=reviews", icon: "reviews" },
    ],
  },
];

const STORE = "everframe-admin-nav-collapsed";

// The sidebar (desktop, collapsible) and the slide-in menu (phones and tablets).
// The sign-out button arrives as `signOut` because it is a server action form.
export default function AdminNav({
  current,
  name,
  signOut,
  children,
}: {
  current: NavKey;
  name: string;
  signOut: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  // A new page was opened from the drawer: close it (adjusting state while rendering, the React way).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    try {
      // Restoring a saved preference after the first paint avoids a server/browser mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(STORE) === "1") setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORE, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  // Drawer: Escape closes it, Tab stays inside it, the page behind does not scroll.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = drawer.current?.querySelector<HTMLElement>("a,button");
    first?.focus();
    const btn = menuBtn.current;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !drawer.current) return;
      const f = drawer.current.querySelectorAll<HTMLElement>(
        "a[href],button:not([disabled])",
      );
      if (f.length === 0) return;
      const a = f[0];
      const z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      btn?.focus();
    };
  }, [open]);

  function renderNav(isCollapsed: boolean) {
    return (
      <nav aria-label="Admin" className="flex flex-col gap-5">
        {GROUPS.map((g) => (
          <div key={g.label}>
            {!isCollapsed && <p className="a-eyebrow mb-2 px-3">{g.label}</p>}
            <ul className="flex flex-col gap-1">
              {g.items.map((it) => (
                <li key={it.key}>
                  <Link
                    href={it.href}
                    aria-current={current === it.key ? "page" : undefined}
                    title={isCollapsed ? it.label : undefined}
                    aria-label={isCollapsed ? it.label : undefined}
                    className={`a-nav-link ${isCollapsed ? "justify-center px-0" : ""}`}
                  >
                    <Icon name={it.icon} />
                    {!isCollapsed && <span>{it.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          {!isCollapsed && <p className="a-eyebrow mb-2 px-3">System</p>}
          <ul className="flex flex-col gap-1">
            <li>
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                title={isCollapsed ? "View public site" : undefined}
                aria-label={isCollapsed ? "View public site (new tab)" : undefined}
                className={`a-nav-link ${isCollapsed ? "justify-center px-0" : ""}`}
              >
                <Icon name="external" />
                {!isCollapsed && <span>View public site</span>}
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    );
  }

  const initial = (name.trim()[0] ?? "A").toUpperCase();
  const profile = (isCollapsed: boolean) => (
    <div className="border-t border-[var(--a-line)] pt-4">
      <div
        className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : "px-1"}`}
      >
        <span
          aria-hidden="true"
          className="a-serif grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--a-olive-d)] text-lg text-white"
        >
          {initial}
        </span>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-xs text-neutral-500">Administrator</p>
          </div>
        )}
      </div>
      <div className={`mt-3 ${isCollapsed ? "flex justify-center" : ""}`}>
        {signOut}
      </div>
    </div>
  );

  const brand = (isCollapsed: boolean) => (
    <Link
      href="/admin"
      className={`flex items-center gap-2.5 ${isCollapsed ? "justify-center" : "px-1"}`}
      aria-label="Everframe admin overview"
    >
      <span
        aria-hidden="true"
        className="a-serif grid h-9 w-9 flex-none place-items-center rounded-md bg-[var(--a-ink)] text-xl text-[#f0eee7]"
      >
        E
      </span>
      {!isCollapsed && (
        <span className="leading-tight">
          <span className="a-serif block text-xl">Everframe</span>
          <span className="a-eyebrow block !text-[0.62rem]">Studio admin</span>
        </span>
      )}
    </Link>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside
        data-collapsed={collapsed ? "true" : "false"}
        className={`sticky top-0 hidden h-screen flex-none flex-col justify-between gap-6 overflow-y-auto border-r border-[var(--a-line)] bg-[var(--a-sidebar)] p-4 lg:flex ${collapsed ? "w-[76px]" : "w-64"}`}
      >
        <div className="flex flex-col gap-8">
          {brand(collapsed)}
          {renderNav(collapsed)}
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-pressed={collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`a-nav-link ${collapsed ? "justify-center px-0" : ""}`}
          >
            <Icon name={collapsed ? "expand" : "collapse"} />
            {!collapsed && <span>Collapse</span>}
          </button>
          {profile(collapsed)}
        </div>
      </aside>

      {/* Phone and tablet top bar */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--a-line)] bg-[var(--a-sidebar)]/95 px-4 py-2.5 backdrop-blur lg:hidden">
          {brand(false)}
          <button
            ref={menuBtn}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="admin-drawer"
            aria-label="Open menu"
            className="a-btn !min-h-11 !min-w-11 !px-2.5"
          >
            <Icon name="menu" />
          </button>
        </header>

        {open && (
          <>
            <div
              className="a-drawer-back lg:hidden"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              id="admin-drawer"
              ref={drawer}
              role="dialog"
              aria-modal="true"
              aria-label="Admin menu"
              className="a-drawer lg:hidden !right-auto left-0 flex !w-[min(20rem,88vw)] flex-col justify-between gap-6 !bg-[var(--a-sidebar)] p-4"
              style={{ boxShadow: "12px 0 40px rgb(37 37 31 / 0.18)" }}
            >
              <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between">
                  {brand(false)}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="a-btn !min-h-11 !min-w-11 !px-2.5"
                  >
                    <Icon name="close" />
                  </button>
                </div>
                {renderNav(false)}
              </div>
              {profile(false)}
            </div>
          </>
        )}

        {children}
      </div>
    </div>
  );
}