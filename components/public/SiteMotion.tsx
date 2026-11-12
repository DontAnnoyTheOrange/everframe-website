"use client";

import type Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

// Desktop scrolling polish, added without changing any page's markup:
//  1. Smooth scrolling (Lenis), kept in step with the GSAP scroll animations.
//  2. Menu and in-page links glide to their section instead of jumping (works on phones too).
//  3. Magnetic buttons: anything marked data-magnetic leans slightly toward the mouse.
//
// Rules, so nobody is worse off:
//  - Smooth scrolling and magnetic buttons run only with a mouse (pointer: fine, hover: hover), when the
//    visitor has NOT asked for reduced motion and is not in forced-colors (high contrast) mode.
//  - Section links glide on every device, but jump instantly for visitors who prefer reduced motion.
//  - Smooth scrolling steps aside while the phone-size menu is open or a dialog/list is being scrolled.
//  - Keyboard scrolling and Tab focus are left to the browser; after a section link the section gets focus.
// Everything is created in effects and removed again if the visitor's settings change.

const ENABLED_QUERY =
  "(pointer: fine) and (hover: hover) and (prefers-reduced-motion: no-preference) and (forced-colors: none)";

// The running smooth-scroll engine, if any (shared with the section-link handler below).
let activeLenis: Lenis | null = null;

function useSmoothScroll() {
  useEffect(() => {
    const query = window.matchMedia(ENABLED_QUERY);
    let cancelled = false;
    let teardown: (() => void) | null = null;

    const start = async () => {
      let LenisClass: typeof import("lenis").default;
      try {
        LenisClass = (await import("lenis")).default;
      } catch {
        return; // normal scrolling stays
      }
      if (cancelled || !query.matches || teardown) return;

      const lenis = new LenisClass({
        autoRaf: false,
        lerp: 0.1,
        wheelMultiplier: 1,
        stopInertiaOnNavigate: true,
        // Scrollable pieces inside the page keep their own native scrolling.
        prevent: (node) =>
          !!node.closest(
            "dialog[open], [role='dialog'], [role='listbox'], [data-lenis-prevent]",
          ),
      });
      activeLenis = lenis;
      const onScroll = () => ScrollTrigger.update();
      lenis.on("scroll", onScroll);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      // Something locks the page (the phone-size menu): pause smoothing while body scrolling is off.
      const sync = () => {
        if (document.body.style.overflow === "hidden") lenis.stop();
        else lenis.start();
      };
      const mo = new MutationObserver(sync);
      mo.observe(document.body, {
        attributes: true,
        attributeFilter: ["style"],
      });
      sync();

      teardown = () => {
        mo.disconnect();
        gsap.ticker.remove(tick);
        gsap.ticker.lagSmoothing(500, 33);
        lenis.off("scroll", onScroll);
        lenis.destroy();
        if (activeLenis === lenis) activeLenis = null;
        teardown = null;
      };
    };

    const evaluate = () => {
      teardown?.();
      if (query.matches) void start();
    };
    evaluate();
    query.addEventListener("change", evaluate);
    return () => {
      cancelled = true;
      query.removeEventListener("change", evaluate);
      teardown?.();
    };
  }, []);
}

// Where the page must be scrolled so a section sits under the sticky menu. Uses the same CSS the browser
// uses for #links (scroll-padding on <html>, scroll-margin on the section), so both ways land identically.
function scrollTopFor(el: Element): number {
  const pad =
    parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) ||
    0;
  const mar = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  return el.getBoundingClientRect().top + window.scrollY - pad - mar;
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function useSectionLinks() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a =
        e.target instanceof Element
          ? e.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!a || a.hasAttribute("download")) return;
      if (a.target && a.target !== "_self") return;
      if (a.origin !== location.origin || a.pathname !== location.pathname)
        return;
      if (a.search !== location.search) return;

      // "#something" on this page, or a link to this very page (the logo, "Home") = back to the top.
      let target: Element | null = null;
      let top = 0;
      if (a.hash.length > 1) {
        target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
        if (!target) {
          // No such section: the browser handles it, but end any glide still running first.
          activeLenis?.scrollTo(window.scrollY, {
            immediate: true,
            force: true,
          });
          return;
        }
        top = scrollTopFor(target);
      } else if (!a.hash) {
        top = 0;
      } else {
        return;
      }

      e.preventDefault();
      const distance = Math.abs(top - window.scrollY);
      if (reduce.matches) {
        activeLenis?.scrollTo(top, { immediate: true, force: true });
        window.scrollTo({ top, behavior: "instant" });
      } else if (activeLenis) {
        activeLenis.scrollTo(top, {
          force: true, // also while the phone-size menu is closing
          duration: Math.min(1.8, Math.max(0.9, distance / 2200)),
          easing: easeInOutCubic,
        });
      } else {
        window.scrollTo({ top, behavior: "smooth" });
      }

      // Keep the address in step (so the section can be shared) and move focus there for keyboard and
      // screen-reader users.
      const url = location.pathname + location.search + a.hash;
      if (location.hash !== a.hash)
        history.replaceState(history.state, "", url);
      if (target instanceof HTMLElement) {
        if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    };

    // Capture phase: this must run before the site's own link handler and before the page transition.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}

// Arriving on the home page with a #section in the address (from another page, or a shared link): the browser
// jumps there at once, but the pinned "exhibition" adds its scroll length a moment later and would push that
// section down. So re-align until the exhibition has settled, and stop the moment the visitor scrolls.
function useHashArrival() {
  const pathname = usePathname();
  useEffect(() => {
    const hash = window.location.hash;
    if (pathname !== "/" || hash.length < 2) return;
    const id = decodeURIComponent(hash.slice(1));
    let done = false;
    const align = () => {
      if (done) return;
      const el = document.getElementById(id);
      if (!el) return;
      const top = scrollTopFor(el);
      if (Math.abs(window.scrollY - top) > 2) {
        window.scrollTo({ top, behavior: "instant" });
      }
    };
    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    const stop = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      ScrollTrigger.removeEventListener("refresh", align);
      for (const ev of events) window.removeEventListener(ev, stop);
    };
    const timer = window.setTimeout(stop, 2500);
    ScrollTrigger.addEventListener("refresh", align);
    for (const ev of events)
      window.addEventListener(ev, stop, { passive: true, once: true });
    align();
    return stop;
  }, [pathname]);
}

function useMagnetic() {
  useEffect(() => {
    const query = window.matchMedia(ENABLED_QUERY);
    let teardown: (() => void) | null = null;

    const start = () => {
      let current: HTMLElement | null = null;
      let cx = 0;
      let cy = 0;

      const release = (el: HTMLElement) => {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.7,
          ease: "elastic.out(1, 0.45)",
          overwrite: "auto",
        });
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const t = e.target instanceof Element ? e.target : null;
        const el = t?.closest<HTMLElement>("[data-magnetic]") ?? null;
        if (el !== current) {
          if (current) release(current);
          current = el;
          if (el) {
            // Centre of the button at rest (its box minus any lean it already has).
            const r = el.getBoundingClientRect();
            cx = r.left + r.width / 2 - Number(gsap.getProperty(el, "x"));
            cy = r.top + r.height / 2 - Number(gsap.getProperty(el, "y"));
          }
        }
        if (!el) return;
        const pull = (v: number) => Math.max(-10, Math.min(10, v * 0.3));
        gsap.to(el, {
          x: pull(e.clientX - cx),
          y: pull(e.clientY - cy),
          duration: 0.4,
          ease: "power3.out",
          overwrite: "auto",
        });
      };
      const onLeaveWindow = () => {
        if (current) release(current);
        current = null;
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeaveWindow);
      teardown = () => {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener(
          "pointerleave",
          onLeaveWindow,
        );
        document
          .querySelectorAll<HTMLElement>("[data-magnetic]")
          .forEach((el) => gsap.set(el, { x: 0, y: 0 }));
        teardown = null;
      };
    };

    const evaluate = () => {
      teardown?.();
      if (query.matches) start();
    };
    evaluate();
    query.addEventListener("change", evaluate);
    return () => {
      query.removeEventListener("change", evaluate);
      teardown?.();
    };
  }, []);
}

export default function SiteMotion() {
  useSmoothScroll();
  useSectionLinks();
  useHashArrival();
  useMagnetic();
  return null;
}