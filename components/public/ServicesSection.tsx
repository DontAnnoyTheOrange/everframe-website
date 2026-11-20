"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import CloudImage from "@/components/portfolio/CloudImage";

export type ServiceImage =
  | {
      kind: "cloud";
      cloud: string;
      publicId: string;
      width: number;
      height: number;
      alt: string;
    }
  | { kind: "local"; src: string; alt: string }
  | null;

export type ServiceItem = {
  key: string;
  title: string;
  text: string;
  note: string | null;
  image: ServiceImage;
};

function Picture({
  image,
  sizes,
  priority,
}: {
  image: NonNullable<ServiceImage>;
  sizes: string;
  priority?: boolean;
}) {
  const cls = "absolute inset-0 h-full w-full object-cover";
  return image.kind === "cloud" ? (
    <CloudImage
      cloud={image.cloud}
      publicId={image.publicId}
      width={image.width}
      height={image.height}
      alt={image.alt}
      sizes={sizes}
      priority={priority}
      className={cls}
    />
  ) : (
    <Image
      src={image.src}
      alt={image.alt}
      fill
      sizes={sizes}
      className={`${cls} object-[50%_30%]`}
    />
  );
}

// Six services as an editorial list. On a computer, pointing at (or tabbing to) a service opens its
// description and shows its photograph on the right. On phones every service is a card with its photo.
// A service with no photo yet shows a plain typographic panel: no stock pictures, no invented work.
export default function ServicesSection({ items }: { items: ServiceItem[] }) {
  const [active, setActive] = useState(0);
  const current = items[active];
  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="scroll-mt-20 px-6 py-20 md:px-16 md:py-28"
    >
      <p className="text-brass text-xs tracking-[0.25em] uppercase">Services</p>
      <h2
        id="services-heading"
        className="text-bone mt-2 font-serif text-3xl md:text-5xl"
      >
        What we capture
      </h2>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-20">
        <ol className="border-line divide-line divide-y border-y">
          {items.map((s, i) => (
            <li
              key={s.key}
              data-active={i === active}
              onMouseEnter={() => setActive(i)}
              onFocusCapture={() => setActive(i)}
              className="group py-6 lg:py-7"
            >
              {s.image && (
                <div className="border-line relative mb-5 aspect-[16/10] overflow-hidden rounded-sm border lg:hidden">
                  <Picture image={s.image} sizes="90vw" />
                </div>
              )}
              <div className="flex items-baseline gap-5">
                <span className="text-brass font-serif text-lg tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <h3
                    className={`font-serif text-2xl transition-colors duration-300 md:text-4xl ${
                      i === active ? "text-bone" : "text-bone lg:text-mute"
                    }`}
                  >
                    {s.title}
                  </h3>
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-out lg:max-h-0 lg:opacity-0 ${
                      i === active ? "lg:max-h-48 lg:opacity-100" : ""
                    }`}
                  >
                    <p className="text-stone mt-3 max-w-lg leading-relaxed">
                      {s.text}
                    </p>
                    {s.note && (
                      <p className="text-mute mt-2 text-sm">{s.note}</p>
                    )}
                    <Link
                      href="/pricing"
                      className="text-brass mt-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
                    >
                      See packages and prices
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Photograph for the service you are looking at (computers only). */}
        <div className="hidden lg:block">
          <div className="border-line bg-ink-2 sticky top-28 aspect-[4/5] overflow-hidden rounded-sm border">
            {items.map((s, i) => (
              <div
                key={s.key}
                aria-hidden={i !== active}
                className={`absolute inset-0 transition-opacity duration-700 ${i === active ? "opacity-100" : "opacity-0"}`}
              >
                {s.image ? (
                  <Picture image={s.image} sizes="40vw" priority={i === 0} />
                ) : (
                  <div className="text-mute flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                    <span className="text-brass font-serif text-6xl">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-serif text-2xl text-[#F5F1EA]">
                      {s.title}
                    </span>
                    <span className="text-xs">Photos coming soon</span>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
            ))}
          </div>
          <p className="text-mute mt-3 text-xs" aria-live="polite">
            {current.image ? current.image.alt : ""}
          </p>
        </div>
      </div>
    </section>
  );
}