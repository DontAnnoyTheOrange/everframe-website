"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// The home page is one long page: each menu item glides to its section ("id"). On the other pages of the
// site ("page") the matching item is highlighted instead.
const links = [
  { href: "/", label: "Home", id: "", page: "" },
  { href: "/#work", label: "Portfolio", id: "work", page: "/portfolio" },
  { href: "/#studio", label: "About", id: "studio", page: "" },
  { href: "/#services", label: "Services", id: "services", page: "" },
  { href: "/#pricing", label: "Pricing", id: "pricing", page: "/pricing" },
  { href: "/#contact", label: "Contact", id: "contact", page: "/contact" },
];
const SECTION_IDS = ["work", "studio", "services", "pricing", "contact"];

const cta =
  "bg-brass text-brass-ink hidden min-h-11 items-center rounded-md px-4 text-sm font-medium transition-transform hover:-translate-y-0.5 min-[350px]:inline-flex";

// Sticks to the top. Transparent over the hero, then a dark blurred bar once you scroll.
// On small screens the links live in a full-screen menu.
export default function SiteNav() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [spy, setSpy] = useState(""); // which home-page section is in view ("" = the top)
  const toggle = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    const id = requestAnimationFrame(onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(id);
    };
  }, []);

  // On the home page, follow the scroll so the menu shows which section you are in.
  useEffect(() => {
    if (path !== "/") return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.4;
      let cur = "";
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) cur = id;
      }
      const atEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atEnd && document.getElementById("contact")) cur = "contact";
      setSpy(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    raf = requestAnimationFrame(update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      // Keep Tab inside the open menu: its links, its button and the menu toggle.
      const menu = document.getElementById("mobile-menu");
      const items = [
        toggle.current,
        ...Array.from(menu?.querySelectorAll<HTMLElement>("a[href]") ?? []),
      ].filter((el): el is HTMLElement => el !== null);
      const first = items[0];
      const last = items[items.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && at === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = (l: (typeof links)[number]) => {
    if (path === "/") return spy === l.id ? "location" : undefined;
    return l.page && path.startsWith(l.page) ? "page" : undefined;
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 h-[72px] transition-colors duration-300 ${
          scrolled || open
            ? "border-line bg-ink/85 border-b backdrop-blur-md"
            : "border-b border-transparent"
        }`}
      >
        <div className="flex h-full items-center justify-between px-6 md:px-16">
          <Link
            href="/"
            className="text-bone -mx-1 inline-flex min-h-11 items-center px-1 font-serif text-xl tracking-wide"
            onClick={() => setOpen(false)}
          >
            Everframe
          </Link>
          <nav
            aria-label="Main"
            className="text-stone hidden gap-8 text-sm lg:flex"
          >
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                aria-current={current(l)}
                data-active={current(l) ? "true" : undefined}
                className="hover:text-bone data-[active=true]:text-bone relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-[#C9A24B] after:transition-transform hover:after:scale-x-100 data-[active=true]:after:scale-x-100"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/booking" data-magnetic className={cta}>
              Book a session
            </Link>
            <button
              ref={toggle}
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((o) => !o)}
              className="text-bone border-line flex h-11 w-11 items-center justify-center rounded-md border lg:hidden"
            >
              <span aria-hidden="true" className="relative block h-3 w-5">
                <span
                  className={`absolute left-0 block h-px w-5 bg-current transition-all ${open ? "top-1.5 rotate-45" : "top-0"}`}
                />
                <span
                  className={`absolute top-1.5 left-0 block h-px w-5 bg-current transition-opacity ${open ? "opacity-0" : ""}`}
                />
                <span
                  className={`absolute left-0 block h-px w-5 bg-current transition-all ${open ? "top-1.5 -rotate-45" : "top-3"}`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="bg-ink fixed inset-x-0 top-[72px] bottom-0 z-40 overflow-y-auto overscroll-contain px-6 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] lg:hidden"
        >
          <nav aria-label="Mobile">
            <ul className="flex flex-col">
              {links.map((l, i) => (
                <li key={l.label} className="border-line border-b">
                  <Link
                    ref={i === 0 ? firstLink : undefined}
                    href={l.href}
                    aria-current={current(l)}
                    data-active={current(l) ? "true" : undefined}
                    onClick={() => setOpen(false)}
                    className="text-bone data-[active=true]:text-brass block py-4 font-serif text-2xl sm:py-5 sm:text-3xl"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link
            href="/booking"
            onClick={() => setOpen(false)}
            className="bg-brass text-brass-ink mt-6 block rounded-md px-6 py-4 text-center font-medium"
          >
            Book a session
          </Link>
        </div>
      )}
    </>
  );
}