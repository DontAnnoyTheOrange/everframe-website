import Link from "next/link";
import CloudImage from "@/components/portfolio/CloudImage";
import ContactLinks from "@/components/public/ContactLinks";
import type { PortfolioCard } from "@/lib/data/portfolio";
import type { SiteSettings, Testimonial } from "@/lib/data/settings";
import { formatPeso } from "@/lib/format";
import type { Catalog } from "@/lib/types/db";

const eyebrow = "text-brass text-xs tracking-[0.25em] uppercase";
const h2 = "text-bone mt-2 font-serif text-3xl md:text-4xl";

/** About the studio. Uses the owner's own words when they wrote some, otherwise plain facts. */
export function StudioSection({
  settings,
  homeBase,
}: {
  settings: SiteSettings;
  homeBase: string;
}) {
  const stats = [
    settings.eventsShot !== null && settings.eventsShot > 0
      ? { n: `${settings.eventsShot}+`, label: "events covered" }
      : null,
    settings.yearsExperience !== null && settings.yearsExperience > 0
      ? {
          n: String(settings.yearsExperience),
          label: "years behind the camera",
        }
      : null,
  ].filter((s): s is { n: string; label: string } => s !== null);
  return (
    <section className="px-6 py-20 md:px-16">
      <p className={eyebrow}>The studio</p>
      <h2 className={h2}>One team for photo and video</h2>
      <div className="mt-6 grid gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <p className="text-stone max-w-2xl text-base leading-relaxed whitespace-pre-line">
          {settings.aboutText ||
            `Everframe Productions covers weddings, debuts, corporate events and concerts. We are based in ${homeBase}${settings.serviceArea ? ` and cover ${settings.serviceArea}` : " and travel for events across the Philippines"}.`}
        </p>
        {stats.length > 0 && (
          <dl className="flex gap-10">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-mute text-xs">{s.label}</dt>
                <dd className="text-brass mt-1 font-serif text-4xl">{s.n}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

/** One big picture per event type, taken from the real portfolio. Hidden until there is work to show. */
export function FeaturedWork({
  cards,
  cloud,
}: {
  cards: PortfolioCard[];
  cloud: string;
}) {
  const seen = new Set<string>();
  const picks = cards
    .filter((c) => c.cover)
    .filter((c) =>
      seen.has(c.category_id) ? false : !!seen.add(c.category_id),
    )
    .slice(0, 3);
  if (picks.length === 0 || !cloud) return null;
  return (
    <section id="featured" className="px-6 pb-20 md:px-16">
      <p className={eyebrow}>Featured work</p>
      <h2 className={h2}>Recent moments</h2>
      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {picks.map((c) => (
          <li key={c.id}>
            <Link
              href={`/portfolio?category=${c.category_slug}`}
              className="group border-line relative block overflow-hidden rounded-md border"
            >
              <CloudImage
                cloud={cloud}
                publicId={c.cover!.cloudinary_public_id}
                width={c.cover!.width}
                height={c.cover!.height}
                alt={c.cover!.alt_text}
                sizes="(min-width: 768px) 33vw, 100vw"
                className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-sm text-[#F5F1EA]">
                {c.category_name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/portfolio"
        className="text-stone hover:text-bone mt-6 inline-block text-sm underline underline-offset-4"
      >
        See the full portfolio
      </Link>
    </section>
  );
}

/** How booking works. The turnaround and transport fee come from the real price list. */
export function Journey({ catalog }: { catalog: Catalog | null }) {
  const steps = [
    {
      t: "Check the date",
      d: "Pick your event type and package, then see which dates and times are still open.",
    },
    {
      t: "Send your request",
      d: "Share your venue and details. Nothing is charged when you send a request.",
    },
    {
      t: "We confirm",
      d: "We review your request and confirm it with you through Messenger or email.",
    },
    {
      t: "We shoot and deliver",
      d: catalog
        ? `Photo: ${catalog.turnaround.photo}. Video: ${catalog.turnaround.video}.`
        : "We deliver your finished photos and videos after the event.",
    },
  ];
  return (
    <section className="px-6 py-20 md:px-16">
      <p className={eyebrow}>How it works</p>
      <h2 className={h2}>From first message to final files</h2>
      <ol className="mt-8 grid gap-4 md:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.t} className="border-line bg-ink-2 rounded-md border p-5">
            <span className="text-brass font-serif text-2xl">0{i + 1}</span>
            <h3 className="text-bone mt-2 text-base">{s.t}</h3>
            <p className="text-mute mt-1 text-sm leading-relaxed">{s.d}</p>
          </li>
        ))}
      </ol>
      {catalog && (
        <p className="text-mute mt-6 text-sm">
          Events outside {catalog.homeBase} add a{" "}
          {formatPeso(catalog.transportFee)} transport fee, shown in your price
          before you send a request.
        </p>
      )}
    </section>
  );
}

/** Real client words only. Hidden until the owner adds some. */
export function Reviews({ items }: { items: Testimonial[] }) {
  if (items.length === 0) return null;
  return (
    <section className="px-6 py-20 md:px-16">
      <p className={eyebrow}>Kind words</p>
      <h2 className={h2}>From our clients</h2>
      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {items.slice(0, 6).map((t) => (
          <li key={t.id}>
            <figure className="border-line bg-ink-2 h-full rounded-md border p-6">
              <blockquote className="text-bone leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="text-mute mt-4 text-sm">
                {t.author}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Last call to action: message us, or check dates. */
export function ClosingCta({ settings }: { settings: SiteSettings }) {
  return (
    <section className="px-6 py-20 md:px-16">
      <div className="border-line rounded-md border px-6 py-14 text-center md:px-16">
        <h2 className="text-bone font-serif text-3xl md:text-5xl">
          Let&apos;s plan your day
        </h2>
        <p className="text-stone mx-auto mt-4 max-w-lg">
          Check if your date is open, or send us a message with your questions.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/booking"
            className="bg-brass text-brass-ink rounded-md px-6 py-3 text-sm font-medium"
          >
            Check availability
          </Link>
          {settings.messengerHref ? (
            <a
              href={settings.messengerHref}
              target="_blank"
              rel="noopener noreferrer"
              className="border-line text-bone rounded-md border px-6 py-3 text-sm"
            >
              Message us on Messenger
            </a>
          ) : (
            <Link
              href="/contact"
              className="border-line text-bone rounded-md border px-6 py-3 text-sm"
            >
              Contact us
            </Link>
          )}
        </div>
        <ContactLinks settings={settings} className="mt-8 justify-center" />
      </div>
    </section>
  );
}