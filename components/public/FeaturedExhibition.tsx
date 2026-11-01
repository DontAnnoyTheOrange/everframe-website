"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef } from "react";
import CloudImage from "@/components/portfolio/CloudImage";

gsap.registerPlugin(ScrollTrigger);

export type ExhibitItem = {
  id: string;
  slug: string;
  title: string;
  categoryName: string;
  cover: { publicId: string; width: number; height: number; alt: string };
};

// "Photography exhibition": on large screens the section pins to the screen and your vertical scroll
// slides the photos sideways, each photo drifting slightly inside its frame. On phones, tablets, and
// for visitors who prefer reduced motion it is an ordinary swipe/scroll row with snap points, which
// also works without JavaScript. Keyboard focus on a photo scrolls it into view in both modes.
export default function FeaturedExhibition({
  items,
  cloud,
}: {
  items: ExhibitItem[];
  cloud: string;
}) {
  const section = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sec = section.current;
    const view = viewport.current;
    const strip = track.current;
    if (!sec || !view || !strip || items.length < 3) return;
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        sec.dataset.pinned = "true";
        view.scrollLeft = 0;
        const distance = () =>
          Math.max(0, strip.scrollWidth - view.clientWidth);
        const slide = gsap.to(strip, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: sec,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (bar.current)
                bar.current.style.transform = `scaleX(${self.progress})`;
            },
          },
        });
        const st = slide.scrollTrigger!;

        // Each photo moves a little against the slide, like looking through a window.
        strip
          .querySelectorAll<HTMLElement>("[data-parallax]")
          .forEach((img) => {
            gsap.fromTo(
              img,
              { xPercent: -7 },
              {
                xPercent: 7,
                ease: "none",
                scrollTrigger: {
                  trigger: img.parentElement,
                  containerAnimation: slide,
                  start: "left right",
                  end: "right left",
                  scrub: true,
                },
              },
            );
          });

        // Tabbing to an off-screen photo must scroll the page to it.
        const onFocus = (e: FocusEvent) => {
          const card = (e.target as HTMLElement).closest("li");
          if (!card) return;
          const d = distance();
          if (d === 0) return;
          const want = Math.min(d, Math.max(0, card.offsetLeft - 64));
          window.scrollTo({ top: st.start + (want / d) * (st.end - st.start) });
        };
        strip.addEventListener("focusin", onFocus);

        return () => {
          strip.removeEventListener("focusin", onFocus);
          delete sec.dataset.pinned;
          if (bar.current) bar.current.style.transform = "";
        };
      },
    );

    // Not pinned: scrolling row. Tabbing to a photo brings it into view.
    mm.add("(max-width: 1023px), (prefers-reduced-motion: reduce)", () => {
      const onFocus = (e: FocusEvent) => {
        (e.target as HTMLElement).closest("li")?.scrollIntoView({
          inline: "center",
          block: "nearest",
        });
      };
      strip.addEventListener("focusin", onFocus);
      return () => strip.removeEventListener("focusin", onFocus);
    });

    return () => mm.revert();
  }, [items.length]);

  if (items.length === 0) return null;
  return (
    <section
      ref={section}
      id="featured"
      aria-labelledby="featured-heading"
      className="group bg-ink-2 data-[pinned=true]:flex data-[pinned=true]:h-[100svh] data-[pinned=true]:flex-col data-[pinned=true]:justify-center"
    >
      <div className="flex items-end justify-between gap-6 px-6 pt-16 pb-8 md:px-16">
        <div>
          <p className="text-brass text-xs tracking-[0.25em] uppercase">
            Featured work
          </p>
          <h2
            id="featured-heading"
            className="text-bone mt-2 font-serif text-3xl md:text-5xl"
          >
            The exhibition
          </h2>
        </div>
        <Link
          href="/portfolio"
          className="text-stone hover:text-bone shrink-0 text-sm underline underline-offset-4"
        >
          Full portfolio
        </Link>
      </div>

      <div
        ref={viewport}
        tabIndex={-1}
        className="[scrollbar-width:thin] overflow-x-auto pb-6 group-data-[pinned=true]:overflow-hidden"
        style={{ scrollSnapType: "x proximity" }}
      >
        <ul ref={track} className="flex w-max gap-5 px-6 md:gap-8 md:px-16">
          {items.map((it, i) => (
            <li
              key={it.id}
              className="w-[78vw] shrink-0 snap-center sm:w-[46vw] lg:w-[30vw] lg:snap-none"
            >
              <Link
                href={`/portfolio/${it.slug}`}
                className="group border-line relative block aspect-[4/5] overflow-hidden rounded-sm border"
              >
                <CloudImage
                  cloud={cloud}
                  publicId={it.cover.publicId}
                  width={it.cover.width}
                  height={it.cover.height}
                  alt={it.cover.alt || it.title}
                  sizes="(min-width: 1024px) 36vw, (min-width: 640px) 50vw, 85vw"
                  priority={i < 2}
                  parallax
                  className="absolute inset-y-0 -left-[10%] h-full w-[120%] max-w-none object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-brass text-[11px] tracking-[0.22em] uppercase">
                    {String(i + 1).padStart(2, "0")} · {it.categoryName}
                  </p>
                  <h3 className="text-bone font-serif text-2xl md:text-3xl">
                    {it.title}
                  </h3>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div
        aria-hidden="true"
        className="bg-line mx-6 mb-8 hidden h-px md:mx-16 lg:block"
      >
        <span ref={bar} className="bg-brass block h-px origin-left scale-x-0" />
      </div>
    </section>
  );
}