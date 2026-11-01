"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import CloudImage from "@/components/portfolio/CloudImage";
import type { PortfolioImage } from "@/lib/data/portfolio";
import { cloudinaryUrl } from "@/lib/cloudinary/url";

// Photo layout for one project: columns of different heights (masonry), photos reveal as you scroll,
// a click opens a full-screen viewer. The viewer is the browser's own <dialog> (focus stays inside,
// Esc closes). It also supports arrow keys, on-screen arrows, swiping on touch screens, and it loads
// the neighbouring photos ahead of time so moving through them feels instant.
export default function Gallery({
  cloud,
  images,
  title,
}: {
  cloud: string;
  images: PortfolioImage[];
  title: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const reduce = useReducedMotion();
  const count = images.length;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  // Warm the cache with the next and previous photo.
  useEffect(() => {
    if (open === null) return;
    for (const step of [1, -1]) {
      const n = images[(open + step + count) % count];
      if (n)
        new window.Image().src = cloudinaryUrl(
          cloud,
          n.cloudinary_public_id,
          1600,
        );
    }
  }, [open, images, count, cloud]);

  const go = (step: number) =>
    setOpen((i) => (i === null ? i : (i + step + count) % count));
  const current = open !== null ? images[open] : null;

  return (
    <>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {images.map((img, i) => (
          <motion.li
            key={img.id}
            initial={reduce ? false : { opacity: 0, y: 32 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -6% 0px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4 break-inside-avoid"
          >
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Open photo ${i + 1} of ${count}${img.alt_text ? `: ${img.alt_text}` : ""}`}
              className="group border-line relative block w-full overflow-hidden rounded-sm border"
            >
              <CloudImage
                cloud={cloud}
                publicId={img.cloudinary_public_id}
                width={img.width}
                height={img.height}
                alt={img.alt_text || `${title}, photo ${i + 1}`}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                priority={i < 2}
                className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              {img.caption && (
                <span className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/85 to-transparent p-3 text-left text-xs text-[#F5F1EA] transition-transform duration-500 group-hover:translate-y-0">
                  {img.caption}
                </span>
              )}
            </button>
          </motion.li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={`${title} photo viewer`}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
        className="m-0 h-full max-h-none w-full max-w-none bg-black/95 p-0 text-white backdrop:bg-black"
      >
        {current && (
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 p-4 md:px-24">
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close viewer"
              className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/50 text-xl"
            >
              ×
            </button>
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="absolute top-1/2 left-3 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/50 text-xl hover:border-white"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="absolute top-1/2 right-3 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/50 text-xl hover:border-white"
                >
                  →
                </button>
              </>
            )}
            <CloudImage
              key={current.id}
              cloud={cloud}
              publicId={current.cloudinary_public_id}
              width={current.width}
              height={current.height}
              alt={current.alt_text || `${title}, photo ${(open ?? 0) + 1}`}
              sizes="100vw"
              className="max-h-[80vh] w-auto max-w-full object-contain"
            />
            {current.caption && (
              <p className="text-stone max-w-xl text-center text-sm">
                {current.caption}
              </p>
            )}
            <p className="text-mute text-xs tracking-widest" aria-live="polite">
              {(open ?? 0) + 1} / {count}
            </p>
          </div>
        )}
      </dialog>
    </>
  );
}