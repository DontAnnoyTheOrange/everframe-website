import type { Metadata } from "next";
import Link from "next/link";
import ContactLinks from "@/components/public/ContactLinks";
import { getCatalog } from "@/lib/data/catalog";
import { getSiteSettings } from "@/lib/data/settings";
import { formatPeso } from "@/lib/format";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Message Everframe Productions about your event, or check available dates and send a booking request.",
};

export const revalidate = 60;

export default async function ContactPage() {
  const [settings, catalog] = await Promise.all([
    getSiteSettings(),
    getCatalog(),
  ]);
  const homeBase = catalog?.homeBase ?? "Dasmariñas, Cavite";
  const hasDetails =
    !!settings.emailHref || !!settings.phoneHref || settings.socials.length > 0;
  return (
    <main className="px-6 pt-6 pb-24 md:px-16">
      <p className="text-brass text-xs tracking-[0.25em] uppercase">Contact</p>
      <h1 className="text-bone mt-2 font-serif text-4xl md:text-5xl">
        Tell us about your event
      </h1>
      <p className="text-stone mt-4 max-w-xl leading-relaxed">
        The fastest way to reach us is Messenger. If you already know your date,
        you can also check availability and send a booking request.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {settings.messengerHref && (
          <a
            href={settings.messengerHref}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brass text-brass-ink rounded-md px-6 py-3 text-sm font-medium"
          >
            Message us on Messenger
          </a>
        )}
        <Link
          href="/booking"
          className={
            settings.messengerHref
              ? "border-line text-bone rounded-md border px-6 py-3 text-sm"
              : "bg-brass text-brass-ink rounded-md px-6 py-3 text-sm font-medium"
          }
        >
          Check availability and book
        </Link>
      </div>

      <div className="mt-14 grid gap-10 md:grid-cols-2">
        {hasDetails && (
          <section aria-labelledby="reach">
            <h2 id="reach" className="text-bone font-serif text-2xl">
              Other ways to reach us
            </h2>
            <ContactLinks settings={settings} className="mt-4" />
          </section>
        )}
        <section aria-labelledby="where">
          <h2 id="where" className="text-bone font-serif text-2xl">
            Where we work
          </h2>
          <p className="text-stone mt-4 leading-relaxed">
            We are based in {homeBase}.{" "}
            {settings.serviceArea
              ? `We cover ${settings.serviceArea}.`
              : "We travel for events across the Philippines."}
            {catalog &&
              ` Events outside ${homeBase} add a ${formatPeso(catalog.transportFee)} transport fee.`}
          </p>
        </section>
      </div>
    </main>
  );
}