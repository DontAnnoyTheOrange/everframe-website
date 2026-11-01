"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

const ROLE = [
  "Photographer",
  "Visual Storyteller",
  "Founder of Everframe Productions",
];

// The opening of the site: Ian Arzaga, the person behind Everframe, as the face of the brand.
// Sequence: photo reveals, name rises, role and introduction fade in, scroll cue appears.
// While scrolling the photo and name drift at different speeds (parallax); on desktop the photo also
// follows the cursor slightly. Reduced-motion visitors get the finished layout with no movement.
export default function HomeHero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(".hero-photo", { clipPath: "inset(0 0 0% 0)" });
      gsap.set(".hero-word", { yPercent: 0, y: 0 });
      gsap.set(".hero-fade", { opacity: 1, y: 0 });
    });

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      let started = false;
      let intro: gsap.core.Timeline | null = null;
      const start = () => {
        if (started) return;
        started = true;
        intro = gsap
          .timeline({ defaults: { ease: "power4.out" } })
          .fromTo(
            ".hero-photo",
            { clipPath: "inset(0 0 100% 0)" },
            {
              clipPath: "inset(0 0 0% 0)",
              duration: 1.5,
              ease: "power4.inOut",
            },
          )
          .fromTo(
            ".hero-photo-scale",
            { scale: 1.3 },
            { scale: 1, duration: 2.4, ease: "power3.out" },
            "<",
          )
          .fromTo(
            ".hero-word",
            { yPercent: 110, y: 0 },
            { yPercent: 0, y: 0, duration: 1.1, stagger: 0.09 },
            "-=1.1",
          )
          .fromTo(
            ".hero-fade",
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 },
            "-=0.7",
          );
      };
      if (document.documentElement.dataset.efReady === "1") start();
      else window.addEventListener("ef:ready", start, { once: true });
      const fallback = window.setTimeout(start, 4500);

      // Scroll: the photo moves slower than the page, the name a little faster, the copy fades out.
      const scrub = {
        trigger: el,
        start: "top top",
        end: "bottom top",
        scrub: true,
      };
      gsap.to(".hero-parallax-photo", {
        yPercent: 12,
        ease: "none",
        scrollTrigger: scrub,
      });
      gsap.to(".hero-parallax-name", {
        yPercent: -18,
        ease: "none",
        scrollTrigger: scrub,
      });
      gsap.to(".hero-parallax-copy", {
        opacity: 0,
        y: -40,
        ease: "none",
        scrollTrigger: { ...scrub, end: "60% top" },
      });

      // Cursor: desktop mice only. The photo and name drift in opposite directions.
      const cleanups: (() => void)[] = [];
      if (window.matchMedia("(pointer: fine)").matches) {
        const px = gsap.quickTo(".hero-cursor-photo", "x", {
          duration: 0.9,
          ease: "power3.out",
        });
        const py = gsap.quickTo(".hero-cursor-photo", "y", {
          duration: 0.9,
          ease: "power3.out",
        });
        const nx = gsap.quickTo(".hero-cursor-name", "x", {
          duration: 1.1,
          ease: "power3.out",
        });
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - r.left) / r.width - 0.5;
          const dy = (e.clientY - r.top) / r.height - 0.5;
          px(dx * -22);
          py(dy * -16);
          nx(dx * 14);
        };
        el.addEventListener("pointermove", onMove);
        cleanups.push(() => el.removeEventListener("pointermove", onMove));
      }

      return () => {
        window.clearTimeout(fallback);
        window.removeEventListener("ef:ready", start);
        intro?.kill();
        cleanups.forEach((c) => c());
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={root}
      aria-labelledby="hero-title"
      className="ef-grain relative -mt-[72px] flex min-h-[100svh] flex-col overflow-hidden bg-black pt-[72px]"
    >
      {/* Without JavaScript everything must still be visible. */}
      <noscript>
        <style>{`.hero-word{transform:none!important}.hero-fade{opacity:1!important;transform:none!important}.hero-photo{clip-path:none!important}`}</style>
      </noscript>

      {/* Photograph: full-bleed on phones, right half on larger screens. */}
      <div className="hero-parallax-photo absolute inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-[56%]">
        <div className="hero-photo h-full w-full">
          <div className="hero-cursor-photo h-full w-full">
            <div className="hero-photo-scale h-full w-full">
              <Image
                src="/photographer/studio-brown.webp"
                alt="Portrait of Ian Arzaga, photographer and founder of Everframe Productions, in a brown corduroy t-shirt against a warm brown backdrop."
                fill
                priority
                sizes="(min-width: 768px) 56vw, 100vw"
                className="ef-zoom object-cover object-[50%_22%]"
              />
            </div>
          </div>
        </div>
        {/* Blend the photograph into the dark page. */}
        <div className="pointer-events-none absolute inset-0 -left-1 bg-gradient-to-t from-black via-black/30 to-black/20 md:bg-gradient-to-r md:from-black md:via-black/10 md:to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-1/4 bg-gradient-to-t from-black to-transparent md:block" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-end px-6 pt-10 pb-24 md:justify-center md:px-16 md:pb-20">
        <h1 id="hero-title" className="hero-parallax-name">
          <span className="hero-fade text-brass block max-w-[18ch] font-serif text-xl italic md:max-w-none md:text-3xl">
            Behind every frame, there&rsquo;s a story.
          </span>
          <span className="sr-only"> — </span>
          <span className="hero-cursor-name text-bone mt-3 block font-serif text-[clamp(3.6rem,14vw,10.5rem)] leading-[0.9] tracking-tight uppercase">
            {["Ian", "Arzaga"].map((w) => (
              <span key={w} className="block overflow-hidden pb-[0.06em]">
                <span className="hero-word block">{w}</span>
              </span>
            ))}
          </span>
        </h1>

        <div className="hero-parallax-copy mt-6 max-w-xl">
          <p className="hero-fade text-stone flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tracking-[0.18em] uppercase">
            {ROLE.map((r, i) => (
              <span key={r} className="flex items-center gap-3">
                {i > 0 && (
                  <span aria-hidden="true" className="bg-brass h-px w-4" />
                )}
                {r}
              </span>
            ))}
          </p>
          <p className="hero-fade text-bone/85 mt-5 text-base leading-relaxed md:text-lg">
            Capturing genuine emotions, meaningful moments, and stories that
            deserve to be remembered.
          </p>
          <div className="hero-fade mt-8 flex flex-wrap gap-3">
            <Link
              href="/portfolio"
              className="bg-brass text-brass-ink rounded-md px-6 py-3.5 text-sm font-medium transition-transform hover:-translate-y-0.5"
            >
              View portfolio
            </Link>
            <Link
              href="/booking"
              className="border-bone/40 text-bone hover:border-bone rounded-md border px-6 py-3.5 text-sm backdrop-blur-sm transition-colors"
            >
              Book a session
            </Link>
          </div>
        </div>
      </div>

      <a
        href="#after-hero"
        aria-label="Scroll to the next section"
        className="hero-fade text-mute hover:text-bone absolute bottom-6 left-6 z-10 flex items-center gap-3 text-[10px] tracking-[0.3em] uppercase md:left-16"
      >
        <span aria-hidden="true" className="bg-brass block h-px w-10" />
        Scroll
      </a>
    </section>
  );
}