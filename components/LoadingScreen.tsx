"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Everframe Productions — brand loading screen.
 *
 * Usage (in app/layout.tsx or app/page.tsx):
 *
 *   import LoadingScreen from '@/components/LoadingScreen';
 *
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html lang="en">
 *         <body>
 *           <LoadingScreen />
 *           {children}
 *         </body>
 *       </html>
 *     );
 *   }
 *
 * Requires:
 *   npm install framer-motion
 *
 * Logo: replace the SVG monogram below with your actual /public/logo.svg
 * (the exact "EF" letterform + shutter icon) once you export it from the
 * source file — this recreates the layout (corner frame, wordmark,
 * tracked subtitle) but not the precise letterforms.
 */

// How long the loader stays on screen, in milliseconds (6 seconds).
const LOADER_MIN_MS = 4000;

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Always show the loader for the full time on every page load,
    // so the logo and name can be read.
    const minDisplay = new Promise<void>((resolve) =>
      setTimeout(resolve, LOADER_MIN_MS),
    );
    const pageReady = new Promise<void>((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", () => resolve(), { once: true });
    });

    Promise.all([minDisplay, pageReady]).then(() => setVisible(false));
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1, clipPath: "inset(0% 0 0% 0)" }}
          exit={{ clipPath: "inset(50% 0 50% 0)" }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black"
        >
          {/* Corner frame + EF monogram + shutter */}
          <div className="relative h-28 w-28">
            <span className="absolute top-0 left-0 h-5 w-5 border-t-[1.5px] border-l-[1.5px] border-[#C9A24B]" />
            <span className="absolute top-0 right-0 h-5 w-5 border-t-[1.5px] border-r-[1.5px] border-[#C9A24B]" />
            <span className="absolute bottom-0 left-0 h-5 w-5 border-b-[1.5px] border-l-[1.5px] border-[#C9A24B]" />
            <span className="absolute right-0 bottom-0 h-5 w-5 border-r-[1.5px] border-b-[1.5px] border-[#C9A24B]" />

            {/* EF letters — replace with your exact logo SVG/PNG once exported */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <span className="absolute top-3 left-3.5 font-serif text-[56px] leading-none text-[#F5F1EA]">
                E
              </span>
              <span className="absolute right-2.5 bottom-2 font-serif text-[56px] leading-none text-[#C9A24B]">
                F
              </span>
            </motion.div>

            {/* Shutter icon, nested at the E/F overlap like the source logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.svg
                width="26"
                height="26"
                viewBox="0 0 64 64"
                animate={{ rotate: [0, 28, 0] }}
                transition={{
                  duration: 2.4,
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

          {/* Wordmark */}
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="font-serif text-2xl tracking-[0.12em] text-[#F5F1EA]"
          >
            EVERFRAME
          </motion.span>

          {/* Subtitle */}
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
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