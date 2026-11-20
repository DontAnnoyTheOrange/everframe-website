import Link from "next/link";
import ContactLinks from "@/components/public/ContactLinks";
import type { SiteSettings } from "@/lib/data/settings";

export default function SiteFooter({
  settings,
  homeBase,
}: {
  settings: SiteSettings;
  homeBase: string;
}) {
  return (
    <footer className="border-line text-stone border-t px-6 py-12 md:px-16">
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="text-bone font-serif text-2xl">Everframe Productions</p>
          <p className="mt-2 text-sm">
            Photography and videography for events across the Philippines. Based
            in {homeBase}.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 text-sm">
          <Link
            href="/portfolio"
            className="hover:text-bone inline-flex min-h-11 items-center"
          >
            Portfolio
          </Link>
          <Link
            href="/pricing"
            className="hover:text-bone inline-flex min-h-11 items-center"
          >
            Pricing
          </Link>
          <Link
            href="/booking"
            className="hover:text-bone inline-flex min-h-11 items-center"
          >
            Booking
          </Link>
          <Link
            href="/contact"
            className="hover:text-bone inline-flex min-h-11 items-center"
          >
            Contact
          </Link>
        </nav>
      </div>
      <ContactLinks settings={settings} className="mt-8" />
      <p className="text-mute mt-8 text-xs">
        © {new Date().getFullYear()} Everframe Productions. All rights reserved.
      </p>
    </footer>
  );
}