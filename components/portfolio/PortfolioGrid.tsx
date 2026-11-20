"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import CloudImage from "@/components/portfolio/CloudImage";

export type GridCard = {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  featured: boolean;
  imageCount: number;
  hasVideo: boolean;
  cover: {
    publicId: string;
    width: number;
    height: number;
    alt: string;
  } | null;
};

// Sizes for the 6-column desktop grid, repeated every 6 projects, so the layout is uneven (editorial)
// but always fills its rows: one large tile, two small stacked, then three tall ones.
const DESKTOP = [
  "lg:col-span-4 lg:row-span-2",
  "lg:col-span-2 lg:row-span-1",
  "lg:col-span-2 lg:row-span-1",
  "lg:col-span-2 lg:row-span-2",
  "lg:col-span-2 lg:row-span-2",
  "lg:col-span-2 lg:row-span-2",
];

// Project tiles with category filtering. Tiles slide and fade when the filter changes, reveal as they
// scroll into view, and zoom slowly on hover. Each category chip is a real link, so it also works
// without JavaScript (the server filters on ?category=).
export default function PortfolioGrid({
  cards,
  categories,
  initial,
  cloud,
}: {
  cards: GridCard[];
  categories: { slug: string; name: string }[];
  initial: string;
  cloud: string;
}) {
  const [active, setActive] = useState(initial);
  const reduce = useReducedMotion();
  const shown = cards.filter((c) => !active || c.categorySlug === active);

  const choose = (slug: string) => {
    setActive(slug);
    try {
      window.history.replaceState(
        null,
        "",
        slug ? `/portfolio?category=${slug}` : "/portfolio",
      );
    } catch {}
  };

  return (
    <>
      {categories.length > 0 && (
        <nav
          aria-label="Filter by event type"
          className="mt-8 flex flex-wrap gap-2"
        >
          {[{ slug: "", name: "All" }, ...categories].map((c) => (
            <Link
              key={c.slug || "all"}
              href={c.slug ? `/portfolio?category=${c.slug}` : "/portfolio"}
              aria-current={c.slug === active ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                choose(c.slug);
              }}
              className={`inline-flex min-h-11 items-center rounded-full border px-5 text-sm transition-colors ${
                c.slug === active
                  ? "border-brass bg-brass text-brass-ink"
                  : "border-line text-stone hover:text-bone"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      <p className="sr-only" aria-live="polite">
        {shown.length} {shown.length === 1 ? "project" : "projects"} shown
      </p>

      {shown.length === 0 && (
        <p className="text-stone mt-10 max-w-md">
          {active
            ? "No projects in this category yet."
            : "Our portfolio is being prepared. Please check back soon, or message us to see recent work."}
        </p>
      )}

      <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-flow-dense lg:auto-rows-[250px] lg:grid-cols-6">
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((c, i) => (
            <motion.li
              key={c.id}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: 28, scale: 0.97 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
              viewport={{ once: true, margin: "0px 0px -8% 0px" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className={`${DESKTOP[i % DESKTOP.length]} ${i % 6 === 0 ? "sm:col-span-2" : ""}`}
            >
              <Link
                href={`/portfolio/${c.slug}`}
                className="group border-line bg-ink-2 relative block aspect-[4/5] overflow-hidden rounded-sm border sm:aspect-[4/3] lg:aspect-auto lg:h-full"
              >
                {c.cover && cloud ? (
                  <CloudImage
                    cloud={cloud}
                    publicId={c.cover.publicId}
                    width={c.cover.width}
                    height={c.cover.height}
                    alt={c.cover.alt || c.title}
                    sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw"
                    priority={i < 2}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  />
                ) : (
                  <div className="text-mute flex h-full items-center justify-center text-sm">
                    Photos coming soon
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                {c.featured && (
                  <span className="border-brass/60 text-brass absolute top-3 left-3 rounded-full border bg-black/50 px-2.5 py-0.5 text-xs tracking-[0.2em] uppercase backdrop-blur-sm">
                    Featured
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 translate-y-1 p-4 transition-transform duration-500 group-hover:translate-y-0 md:p-5">
                  <p className="text-brass text-xs tracking-[0.22em] uppercase">
                    {c.categoryName}
                  </p>
                  <h2 className="text-bone font-serif text-2xl leading-tight md:text-3xl">
                    {c.title}
                  </h2>
                  <p className="text-stone mt-1 text-xs">
                    {c.imageCount} {c.imageCount === 1 ? "photo" : "photos"}
                    {c.hasVideo ? " · video" : ""}
                  </p>
                </div>
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
}