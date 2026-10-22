import Link from "next/link";
import {
  SERVICE_LABEL,
  SERVICE_ORDER,
  formatPeso,
  hoursLabel,
} from "@/lib/format";
import type { Catalog } from "@/lib/types/db";

// Homepage package overview: tiers grouped by service, with a path into the full calculator and booking.
export default function PackagesOverview({ catalog }: { catalog: Catalog }) {
  const services = SERVICE_ORDER.filter((s) =>
    catalog.packages.some((p) => p.service_type === s),
  );

  return (
    <section id="packages" className="px-6 py-20 md:px-16">
      <p className="text-brass text-xs tracking-[0.25em] uppercase">Packages</p>
      <h2 className="text-bone mt-2 mb-10 font-serif text-3xl md:text-4xl">
        Coverage that fits the day
      </h2>

      <div className="grid gap-6 lg:grid-cols-3">
        {services.map((s) => (
          <div
            key={s}
            className="border-line bg-ink-2 flex flex-col rounded-md border p-6"
          >
            <h3 className="text-bone font-serif text-2xl">
              {SERVICE_LABEL[s]}
            </h3>
            <p className="text-mute mt-1 mb-5 text-xs">
              {catalog.turnaround[s]}
            </p>
            <ul className="divide-line flex flex-1 flex-col divide-y">
              {catalog.packages
                .filter((p) => p.service_type === s)
                .map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div>
                      <p className="text-bone">{p.name}</p>
                      <p className="text-mute text-xs">
                        {hoursLabel(p.max_hours)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-brass tabular-nums">
                        {formatPeso(p.price)}
                      </span>
                      <Link
                        href={`/booking?package=${p.slug}`}
                        className="border-line text-bone hover:border-brass rounded-md border px-3 py-1.5 text-xs"
                      >
                        Book this
                      </Link>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm">
        <Link
          href="/pricing"
          className="text-stone hover:text-bone underline underline-offset-4"
        >
          Open the full calculator for extra hours and add-ons
        </Link>
        <Link
          href="/booking"
          className="bg-brass text-brass-ink rounded-md px-5 py-3 font-medium"
        >
          Check availability
        </Link>
      </div>
    </section>
  );
}