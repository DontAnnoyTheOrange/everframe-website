"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/#studio", label: "About" },
  { href: "/#services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

const cta =
  "bg-brass text-brass-ink rounded-md px-4 py-2 text-sm font-medium transition-transform hover:-translate-y-0.5";

// Sticks to the top. Transparent over the hero, then a dark blurred bar once you scroll.
// On small screens the links live in a full-screen menu.
export default function SiteNav() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = (href: string) => (href === path ? "page" : undefined);

  return (
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
          className="text-bone font-serif text-xl tracking-wide"
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
              aria-current={active(l.href)}
              className="hover:text-bone aria-[current=page]:text-bone relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-[#C9A24B] after:transition-transform hover:after:scale-x-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/booking" className={cta}>
            Book a session
          </Link>
          <button
            ref={toggle}
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
            className="text-bone border-line flex h-10 w-10 items-center justify-center rounded-md border lg:hidden"
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

      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="bg-ink fixed inset-x-0 top-[72px] bottom-0 z-40 overflow-y-auto px-6 py-10 lg:hidden"
        >
          <nav aria-label="Mobile">
            <ul className="flex flex-col">
              {links.map((l, i) => (
                <li key={l.label} className="border-line border-b">
                  <Link
                    ref={i === 0 ? firstLink : undefined}
                    href={l.href}
                    aria-current={active(l.href)}
                    onClick={() => setOpen(false)}
                    className="text-bone aria-[current=page]:text-brass block py-5 font-serif text-3xl"
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
            className="bg-brass text-brass-ink mt-8 block rounded-md px-6 py-4 text-center font-medium"
          >
            Book a session
          </Link>
        </div>
      )}
    </header>
  );
}