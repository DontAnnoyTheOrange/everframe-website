import Image from "next/image";
import Link from "next/link";
import ContactLinks from "@/components/public/ContactLinks";
import type { SiteSettings, Testimonial } from "@/lib/data/settings";
import { formatPeso } from "@/lib/format";
import type { Catalog } from "@/lib/types/db";

const eyebrow = "text-brass text-xs tracking-[0.25em] uppercase";
const h2 = "text-bone mt-2 font-serif text-3xl md:text-4xl";

/** Meet the photographer. Uses Ian's own words when he wrote some, otherwise plain facts only. */
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
    <section id="studio" className="scroll-mt-20 px-6 py-20 md:px-16 md:py-28">
      <div className="grid items-center gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-20">
        <div className="relative mx-auto w-full max-w-md md:max-w-none">
          <div className="border-line relative aspect-[4/5] overflow-hidden rounded-sm border">
            <Image
              src="/photographer/portrait-bw.webp"
              alt="Black and white portrait of Ian Arzaga, photographer and founder of Everframe Productions, standing with his hands in his pockets."
              fill
              sizes="(min-width: 768px) 40vw, 90vw"
              className="object-cover object-[50%_30%]"
            />
          </div>
          <div className="border-line bg-ink absolute -right-3 -bottom-8 w-2/5 overflow-hidden rounded-sm border p-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] md:-right-8">
            <div className="relative aspect-[3/4]">
              <Image
                src="/photographer/camera-bw.webp"
                alt="Ian Arzaga behind his camera on a gimbal, only his eyes visible above the lens."
                fill
                sizes="(min-width: 768px) 16vw, 36vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
        <div>
          <p className={eyebrow}>Meet the photographer</p>
          <h2 className={h2}>Hi, I&rsquo;m Ian Arzaga</h2>
          <p className="text-stone mt-6 max-w-xl text-base leading-relaxed whitespace-pre-line">
            {settings.aboutText ||
              `I am the photographer and videographer behind Everframe Productions, based in ${homeBase}${settings.serviceArea ? ` and covering ${settings.serviceArea}` : ", and I travel for events across the Philippines"}. Weddings, debuts, corporate events and concerts: my goal is to capture genuine emotions and the small moments you will want to relive.`}
          </p>
          {stats.length > 0 && (
            <dl className="mt-8 flex gap-10">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-mute text-xs">{s.label}</dt>
                  <dd className="text-brass mt-1 font-serif text-4xl">{s.n}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/portfolio"
              data-magnetic
              className="border-line text-bone hover:border-brass rounded-md border px-5 py-3 text-sm"
            >
              See my work
            </Link>
            <Link
              href="/booking"
              data-magnetic
              className="bg-brass text-brass-ink rounded-md px-5 py-3 text-sm font-medium"
            >
              Book a session
            </Link>
          </div>
        </div>
      </div>
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

/** Stands in for a homepage section whose content is not available yet, so its menu link still has somewhere to go. */
export function SectionFallback({
  id,
  eyebrowText,
  title,
  text,
  href,
  label,
}: {
  id: string;
  eyebrowText: string;
  title: string;
  text: string;
  href: string;
  label: string;
}) {
  return (
    <section id={id} className="scroll-mt-20 px-6 py-20 md:px-16 md:py-28">
      <p className={eyebrow}>{eyebrowText}</p>
      <h2 className={h2}>{title}</h2>
      <p className="text-stone mt-4 max-w-xl leading-relaxed">{text}</p>
      <Link
        href={href}
        className="border-line text-bone hover:border-brass mt-8 inline-block rounded-md border px-6 py-3 text-sm"
      >
        {label}
      </Link>
    </section>
  );
}

/** Last call to action (the "Contact" section of the home page): message us, or check dates. */
export function ClosingCta({ settings }: { settings: SiteSettings }) {
  return (
    <section id="contact" className="scroll-mt-20 px-6 py-20 md:px-16">
      <div className="border-line rounded-md border px-6 py-14 text-center md:px-16">
        <p className={eyebrow}>Contact</p>
        <h2 className="text-bone font-serif text-3xl md:text-5xl">
          Let&apos;s plan your day
        </h2>
        <p className="text-stone mx-auto mt-4 max-w-lg">
          Check if your date is open, or send us a message with your questions.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/booking"
            data-magnetic
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