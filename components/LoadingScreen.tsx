"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";

// The loader is short on purpose: long enough to read the name, never a wall in front of the site.
const LOADER_MS = 1800;
export const SEEN_KEY = "everframe-intro-seen";

const noop = () => () => {};
function readSeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Tells the hero it may start its entrance animation. */
function announceReady() {
  document.documentElement.dataset.efReady = "1";
  window.dispatchEvent(new Event("ef:ready"));
}

/**
 * Everframe loading introduction. Shown once per browser session (not on every page), skipped quickly
 * for visitors who prefer reduced motion, and never longer than the page needs plus a short intro.
 */
export default function LoadingScreen() {
  // false while the server renders, then the real value in the browser.
  const seen = useSyncExternalStore(noop, readSeen, () => false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (seen) {
      announceReady();
      return;
    }
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const minDisplay = new Promise<void>((resolve) =>
      setTimeout(resolve, reduce ? 300 : LOADER_MS),
    );
    const pageReady = new Promise<void>((resolve) => {
      if (document.readyState === "complete") resolve();
      else {
        window.addEventListener("load", () => resolve(), { once: true });
        setTimeout(resolve, 4000); // never wait forever for a slow image
      }
    });
    let cancelled = false;
    Promise.all([minDisplay, pageReady]).then(() => {
      if (cancelled) return;
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {}
      setDone(true);
      announceReady();
    });
    return () => {
      cancelled = true;
    };
  }, [seen]);

  const visible = !seen && !done;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-label="Loading Everframe Productions"
          initial={{ opacity: 1, clipPath: "inset(0% 0 0% 0)" }}
          exit={{ clipPath: "inset(50% 0 50% 0)" }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          className="ef-loader fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black"
        >
          <div className="relative h-28 w-28">
            <span className="absolute top-0 left-0 h-5 w-5 border-t-[1.5px] border-l-[1.5px] border-[#C9A24B]" />
            <span className="absolute top-0 right-0 h-5 w-5 border-t-[1.5px] border-r-[1.5px] border-[#C9A24B]" />
            <span className="absolute bottom-0 left-0 h-5 w-5 border-b-[1.5px] border-l-[1.5px] border-[#C9A24B]" />
            <span className="absolute right-0 bottom-0 h-5 w-5 border-r-[1.5px] border-b-[1.5px] border-[#C9A24B]" />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <span className="absolute top-3 left-3.5 font-serif text-[56px] leading-none text-[#F5F1EA]">
                E
              </span>
              <span className="absolute right-2.5 bottom-2 font-serif text-[56px] leading-none text-[#C9A24B]">
                F
              </span>
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.svg
                aria-hidden="true"
                width="26"
                height="26"
                viewBox="0 0 64 64"
                animate={{ rotate: [0, 28, 0] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <circle
                  cx="32"
                  cy="32"
                  r="20"
                  fill="#050505"
                  stroke="#D9D4C6"
                  strokeWidth="1.2"
                />
                <path
                  d="M32 16 L38 26 L32 32 L26 26 Z"
                  fill="#C9A24B"
                  opacity="0.9"
                />
                <path
                  d="M48 32 L38 38 L32 32 L38 26 Z"
                  fill="#D9D4C6"
                  opacity="0.9"
                />
                <path
                  d="M32 48 L26 38 L32 32 L38 38 Z"
                  fill="#C9A24B"
                  opacity="0.9"
                />
                <path
                  d="M16 32 L26 26 L32 32 L26 38 Z"
                  fill="#D9D4C6"
                  opacity="0.9"
                />
              </motion.svg>
            </div>
          </div>
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="font-serif text-2xl tracking-[0.12em] text-[#F5F1EA]"
          >
            EVERFRAME
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
            className="flex items-center gap-2.5 text-[11px] tracking-[0.3em] text-[#C9A24B]"
          >
            <span className="inline-block h-px w-5 bg-[#C9A24B]" />
            PRODUCTIONS
            <span className="inline-block h-px w-5 bg-[#C9A24B]" />
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}