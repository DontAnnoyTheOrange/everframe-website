"use client";

import { useEffect, useRef, useState } from "react";
import CloudImage from "@/components/portfolio/CloudImage";
import type { PortfolioImage } from "@/lib/data/portfolio";

// The photo grid with a full-screen viewer. Built on the browser's own <dialog>, which traps focus,
// closes with Esc and gives screen readers a proper dialog. Arrow keys move between photos.
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

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
  }, [open]);

  const count = images.length;
  const go = (step: number) =>
    setOpen((i) => (i === null ? i : (i + step + count) % count));
  const current = open !== null ? images[open] : null;

  return (
    <>
      <ul className="columns-1 gap-3 sm:columns-2 lg:columns-3">
        {images.map((img, i) => (
          <li key={img.id} className="mb-3 break-inside-avoid">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Open photo ${i + 1} of ${count}${img.alt_text ? `: ${img.alt_text}` : ""}`}
              className="block w-full overflow-hidden rounded-md"
            >
              <CloudImage
                cloud={cloud}
                publicId={img.cloudinary_public_id}
                width={img.width}
                height={img.height}
                alt={img.alt_text || `${title}, photo ${i + 1}`}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                priority={i < 2}
                className="h-auto w-full transition-transform duration-500 hover:scale-[1.02]"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={`${title} photo viewer`}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(null); // click on the dark area
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        className="m-0 h-full max-h-none w-full max-w-none bg-black/95 p-0 text-white backdrop:bg-black"
      >
        {current && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
            <CloudImage
              cloud={cloud}
              publicId={current.cloudinary_public_id}
              width={current.width}
              height={current.height}
              alt={current.alt_text || `${title}, photo ${(open ?? 0) + 1}`}
              sizes="100vw"
              className="max-h-[80vh] w-auto max-w-full object-contain"
            />
            {current.caption && (
              <p className="text-stone text-center text-sm">
                {current.caption}
              </p>
            )}
            <p className="text-mute text-xs" aria-live="polite">
              {(open ?? 0) + 1} / {count}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => go(-1)}
                className="rounded-md border border-white/30 px-4 py-2 text-sm"
              >
                ← Previous
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="rounded-md border border-white/30 px-4 py-2 text-sm"
              >
                Next →
              </button>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-md bg-white/15 px-4 py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}