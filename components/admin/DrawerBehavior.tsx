"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Makes a server-rendered drawer behave like a proper dialog: focus moves into it, Escape closes it,
// Tab stays inside it, and the page behind does not scroll.
export default function DrawerBehavior({
  closeHref,
  drawerId,
}: {
  closeHref: string;
  drawerId: string;
}) {
  const router = useRouter();
  useEffect(() => {
    const el = document.getElementById(drawerId);
    if (!el) return;
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])",
        ),
      );
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        router.push(closeHref, { scroll: false });
        return;
      }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      const a = f[0];
      const z = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === a || active === el)) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && active === z) {
        e.preventDefault();
        a.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [closeHref, drawerId, router]);
  return null;
}