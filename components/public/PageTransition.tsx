"use client";

import gsap from "gsap";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// A curtain that wipes up over the page when a visitor goes to another page of the site,
// then lifts to reveal the new page: brass first, then a dark layer carrying the Everframe name.
//
// How it works: a click on an ordinary link to another page of this site is paused, the curtain covers the
// screen (about 0.8 s), the new page is opened underneath it, and when the new page has appeared (the address
// changes) the curtain lifts. Nothing else on the page is touched.
//
// It stays out of the way when:
//  - the visitor prefers reduced motion (links work exactly as before),
//  - the click is not a plain left click (Ctrl/Cmd/Shift/Alt, middle click: new tab or window),
//  - the link opens a new tab, downloads, goes to another website, mailto:/tel:, or is only a #section on this page,
//  - the link has data-no-transition.
// Safety: a stuck curtain is impossible: it lifts by itself after 5 seconds, and it is hidden from screen readers
// and ignores the pointer except for the moment it is covering the page.

const COVER_MS = 0.45;
const SAFETY_MS = 5000;

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const wrap = useRef<HTMLDivElement>(null);
  const panelA = useRef<HTMLDivElement>(null);
  const panelB = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  const revealRef = useRef<() => void>(() => {});
  const covered = useRef(false); // the curtain is down (or going down) and waiting for the new page
  const lastPath = useRef(pathname);
  const timers = useRef<{ safety: number; tl: gsap.core.Timeline | null }>({
    safety: 0,
    tl: null,
  });

  useEffect(() => {
    const el = wrap.current;
    const a = panelA.current;
    const b = panelB.current;
    const w = word.current;
    if (!el || !a || !b || !w) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const HIDDEN = "inset(100% 0 0 0)";
    const FULL = "inset(0% 0 0 0)";
    const GONE = "inset(0 0 100% 0)";

    const reset = () => {
      timers.current.tl?.kill();
      timers.current.tl = null;
      window.clearTimeout(timers.current.safety);
      gsap.set([a, b], { clipPath: HIDDEN });
      gsap.set(w, { opacity: 0, y: 14 });
      gsap.set(el, { visibility: "hidden", pointerEvents: "none" });
      covered.current = false;
    };

    const reveal = () => {
      if (!covered.current) return;
      window.clearTimeout(timers.current.safety);
      timers.current.tl?.kill();
      timers.current.tl = gsap
        .timeline({ onComplete: reset })
        .to(w, { opacity: 0, duration: 0.2 })
        .to(b, { clipPath: GONE, duration: 0.5, ease: "power4.inOut" }, "<")
        .to(
          a,
          { clipPath: GONE, duration: 0.5, ease: "power4.inOut" },
          "-=0.38",
        );
    };
    revealRef.current = reveal;

    const cover = (go: () => void) => {
      covered.current = true;
      gsap.set(el, { visibility: "visible", pointerEvents: "auto" });
      timers.current.tl?.kill();
      timers.current.tl = gsap
        .timeline({ onComplete: go })
        .fromTo(
          a,
          { clipPath: HIDDEN },
          { clipPath: FULL, duration: COVER_MS, ease: "power4.inOut" },
        )
        .fromTo(
          b,
          { clipPath: HIDDEN },
          { clipPath: FULL, duration: COVER_MS, ease: "power4.inOut" },
          "-=0.32",
        )
        .fromTo(
          w,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" },
          "-=0.25",
        );
      // Whatever happens, never leave the visitor under a curtain.
      window.clearTimeout(timers.current.safety);
      timers.current.safety = window.setTimeout(() => {
        revealRef.current();
      }, SAFETY_MS);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (reduce.matches) return;
      const link =
        e.target instanceof Element
          ? e.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!link || link.hasAttribute("data-no-transition")) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      if (link.origin !== location.origin) return; // other sites, mailto:, tel:
      if (link.pathname === location.pathname) return; // same page: #sections, filters
      // A click while the curtain is moving must not start a second trip.
      if (covered.current) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const target = link.pathname + link.search + link.hash;
      router.prefetch(target); // start loading the new page while the curtain rises
      cover(() => router.push(target));
    };

    reset();
    // Capture phase: this must run before the site's own link handler, which would otherwise navigate at once.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      reset();
    };
  }, [router]);

  // The address changed: the new page is on screen, so lift the curtain.
  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    revealRef.current();
  }, [pathname]);

  return (
    <div
      ref={wrap}
      aria-hidden="true"
      style={{ visibility: "hidden", pointerEvents: "none" }}
      className="fixed inset-0 z-[115]"
    >
      <div
        ref={panelA}
        style={{ clipPath: "inset(100% 0 0 0)" }}
        className="bg-brass absolute inset-0"
      />
      <div
        ref={panelB}
        style={{ clipPath: "inset(100% 0 0 0)" }}
        className="absolute inset-0 flex items-center justify-center bg-black"
      >
        <span
          ref={word}
          style={{ opacity: 0 }}
          className="text-bone font-serif text-3xl tracking-[0.2em] uppercase md:text-5xl"
        >
          Everframe
        </span>
      </div>
    </div>
  );
}