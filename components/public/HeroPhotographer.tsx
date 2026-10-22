"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

type Frame = {
  src: string;
  alt: string;
  label: string;
  className: string;
  priority?: boolean;
  labelRight?: boolean;
};

// Three frames, overlapped like prints on a contact sheet.
const frames: Frame[] = [
  {
    src: "/photographer/camera-bw.webp",
    alt: "Black and white portrait of the Everframe photographer holding a Sony camera on a gimbal in front of his face.",
    label: "Frame 01",
    className: "left-0 top-[6%] w-[44%] -rotate-3 z-10",
  },
  {
    src: "/photographer/portrait-bw.webp",
    alt: "Black and white portrait of the Everframe photographer in a corduroy t-shirt and glasses, hands in pockets.",
    label: "Frame 02",
    className: "left-[32%] top-0 w-[44%] z-20",
    priority: true,
  },
  {
    src: "/photographer/studio-brown.webp",
    alt: "Portrait of the Everframe photographer in a brown corduroy t-shirt against a warm brown studio backdrop, looking down.",
    label: "Frame 03",
    className: "right-0 top-[10%] w-[42%] rotate-3 z-10",
    labelRight: true,
  },
];

export default function HeroPhotographer() {
  const reduce = useReducedMotion();

  return (
    <figure className="w-full">
      <div className="relative mx-auto aspect-[4/3.2] w-full max-w-xl md:max-w-none">
        {frames.map((f, i) => (
          <motion.div
            key={f.src}
            className={`absolute ${f.className}`}
            initial={
              reduce ? false : { clipPath: "inset(0 0 100% 0)", opacity: 0.4 }
            }
            animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }}
            transition={{
              duration: 0.9,
              delay: reduce ? 0 : 0.2 + i * 0.18,
              ease: [0.76, 0, 0.24, 1],
            }}
          >
            <div className="border-line bg-ink-2 relative overflow-hidden border shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)]">
              <Image
                src={f.src}
                alt={f.alt}
                width={1000}
                height={1500}
                priority={f.priority}
                sizes="(min-width: 768px) 22vw, 45vw"
                className="h-auto w-full object-cover"
              />
              {/* Fade the dark studio backdrops into the page. */}
              <div className="from-ink/70 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
              <span
                className={`text-brass absolute bottom-2 ${f.labelRight ? "right-2" : "left-2"} font-mono text-[10px] tracking-[0.25em] uppercase`}
              >
                {f.label}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      <figcaption className="text-mute mt-4 flex items-center gap-3 text-xs tracking-[0.2em] uppercase">
        <span className="bg-brass inline-block h-px w-8" />
        Behind the lens, your photographer and videographer
      </figcaption>
    </figure>
  );
}
