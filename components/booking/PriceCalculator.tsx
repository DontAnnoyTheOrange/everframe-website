"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getQuote, type QuoteResult } from "@/app/(public)/pricing/actions";
import {
  SERVICE_LABEL,
  SERVICE_ORDER,
  formatPeso,
  hoursLabel,
} from "@/lib/format";
import type { Catalog, PackageRow, ServiceType } from "@/lib/types/db";

const MAX_HOURS = 12;

type Props = { catalog: Catalog; initialPackageSlug?: string };

export default function PriceCalculator({
  catalog,
  initialPackageSlug,
}: Props) {
  const { packages, addons, includedAddons, categories } = catalog;

  const services = SERVICE_ORDER.filter((s) =>
    packages.some((p) => p.service_type === s),
  );
  const initial =
    packages.find((p) => p.slug === initialPackageSlug) ?? packages[0];

  const [service, setService] = useState<ServiceType>(initial.service_type);
  const [packageId, setPackageId] = useState(initial.id);
  const [hours, setHours] = useState(defaultHours(initial));
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [outsideBase, setOutsideBase] = useState(false);

  const tiers = packages.filter((p) => p.service_type === service);
  const pkg = packages.find((p) => p.id === packageId) ?? tiers[0];
  const includedIds = new Set(
    includedAddons
      .filter((i) => i.package_id === pkg.id)
      .map((i) => i.addon_id),
  );

  function chooseService(next: ServiceType) {
    const first = packages.find((p) => p.service_type === next);
    if (!first) return;
    setService(next);
    choosePackage(first);
  }
  function choosePackage(p: PackageRow) {
    setPackageId(p.id);
    setHours(defaultHours(p));
  }
  function toggleAddon(id: string) {
    setAddonIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  // Ask the database for the price whenever the selection changes.
  const key = JSON.stringify({
    packageId: pkg.id,
    hours,
    addonIds: [...addonIds].sort(),
    outsideBase,
  });
  const [result, setResult] = useState<{
    key: string;
    value: QuoteResult;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const value = await getQuote(JSON.parse(key));
      if (!cancelled) setResult({ key, value });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key]);
  const loading = result?.key !== key;
  const quote = result?.value.ok ? result.value.quote : null;
  const errorMessage =
    result?.key === key && result.value && !result.value.ok
      ? result.value.message
      : null;

  const bookingHref = (() => {
    const q = new URLSearchParams({ package: pkg.slug, hours: String(hours) });
    if (categorySlug) q.set("category", categorySlug);
    if (addonIds.length) q.set("addons", addonIds.join(","));
    if (outsideBase) q.set("outside", "1");
    return `/booking?${q.toString()}`;
  })();

  const turnaround = catalog.turnaround[pkg.service_type];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-8">
        <fieldset>
          <legend className="text-mute mb-3 text-xs tracking-[0.2em] uppercase">
            1. Service
          </legend>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <label key={s} className={chip(service === s)}>
                <input
                  type="radio"
                  name="service"
                  className="sr-only"
                  checked={service === s}
                  onChange={() => chooseService(s)}
                />
                {SERVICE_LABEL[s]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-mute mb-3 text-xs tracking-[0.2em] uppercase">
            2. Package
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {tiers.map((p) => (
              <label
                key={p.id}
                className={`has-[:focus-visible]:outline-brass flex cursor-pointer flex-col gap-1 rounded-md border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${
                  p.id === pkg.id
                    ? "border-brass bg-ink-2"
                    : "border-line hover:border-mute"
                }`}
              >
                <input
                  type="radio"
                  name="package"
                  className="sr-only"
                  checked={p.id === pkg.id}
                  onChange={() => choosePackage(p)}
                />
                <span className="text-bone font-serif text-xl">{p.name}</span>
                <span className="text-brass text-sm">
                  {formatPeso(p.price)}
                </span>
                <span className="text-mute text-xs">
                  {hoursLabel(p.max_hours)}
                </span>
              </label>
            ))}
          </div>
          <details className="text-stone mt-4 text-sm">
            <summary className="text-bone cursor-pointer">
              What is included in {pkg.name}
            </summary>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {pkg.inclusions.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </details>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="event-type"
              className="text-mute mb-3 block text-xs tracking-[0.2em] uppercase"
            >
              3. Event type
            </label>
            <select
              id="event-type"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="border-line bg-ink-2 text-bone w-full rounded-md border px-3 py-2"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span
              id="hours-label"
              className="text-mute mb-3 block text-xs tracking-[0.2em] uppercase"
            >
              4. Coverage hours
            </span>
            <div
              role="group"
              aria-labelledby="hours-label"
              className="border-line inline-flex items-center rounded-md border"
            >
              <button
                type="button"
                aria-label="Fewer hours"
                disabled={hours <= 1}
                onClick={() => setHours((h) => Math.max(1, h - 1))}
                className="text-bone disabled:text-mute px-4 py-2"
              >
                −
              </button>
              <output
                aria-live="polite"
                className="text-bone min-w-24 text-center"
              >
                {hours} {hours === 1 ? "hour" : "hours"}
              </output>
              <button
                type="button"
                aria-label="More hours"
                disabled={hours >= MAX_HOURS}
                onClick={() => setHours((h) => Math.min(MAX_HOURS, h + 1))}
                className="text-bone disabled:text-mute px-4 py-2"
              >
                +
              </button>
            </div>
            <p className="text-mute mt-2 text-xs">
              {pkg.max_hours === null
                ? "Whole-event package: the price is the same for any length."
                : pkg.extra_hour_rate !== null
                  ? `Each hour beyond ${pkg.max_hours} adds ${formatPeso(pkg.extra_hour_rate)}.`
                  : `Hours beyond ${pkg.max_hours} are quoted separately.`}
            </p>
          </div>
        </div>

        <fieldset>
          <legend className="text-mute mb-3 text-xs tracking-[0.2em] uppercase">
            5. Extras
          </legend>
          <div className="text-stone flex flex-col gap-3 text-sm">
            {addons.map((a) => {
              const included = includedIds.has(a.id);
              return (
                <label key={a.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={included || addonIds.includes(a.id)}
                    disabled={included}
                    onChange={() => toggleAddon(a.id)}
                    className="h-4 w-4 accent-[#c9a24b]"
                  />
                  <span className="text-bone">{a.name}</span>
                  <span className="text-mute">
                    {included
                      ? "Included in this package"
                      : `+${formatPeso(a.price)}${a.per_hour ? " per hour" : ""}`}
                  </span>
                </label>
              );
            })}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={outsideBase}
                onChange={(e) => setOutsideBase(e.target.checked)}
                className="h-4 w-4 accent-[#c9a24b]"
              />
              <span className="text-bone">
                Venue is outside {catalog.homeBase || "our home area"}
              </span>
              <span className="text-mute">
                +{formatPeso(catalog.transportFee)} transport
              </span>
            </label>
          </div>
        </fieldset>
      </div>

      <aside
        aria-live="polite"
        className="border-line bg-ink-2 h-fit rounded-md border p-6 lg:sticky lg:top-6"
      >
        <h2 className="text-bone font-serif text-2xl">Your estimate</h2>
        <p className="text-mute mt-1 text-sm">
          {SERVICE_LABEL[pkg.service_type]} · {pkg.name} · {hours}{" "}
          {hours === 1 ? "hour" : "hours"}
        </p>

        <dl
          className={`mt-6 flex flex-col gap-3 text-sm transition-opacity ${loading ? "opacity-50" : ""}`}
        >
          {quote ? (
            <>
              <Line
                label={`${quote.package_name} package`}
                value={formatPeso(quote.base_price)}
              />
              {quote.extra_hours > 0 && !quote.custom_quote && (
                <Line
                  label={`Extra hours (${quote.extra_hours} × ${formatPeso(pkg.extra_hour_rate ?? 0)})`}
                  value={formatPeso(quote.extra_hours_fee)}
                />
              )}
              {quote.addons.map((a) => (
                <Line
                  key={a.id}
                  label={a.name}
                  value={a.included ? "Included" : formatPeso(a.line_total)}
                />
              ))}
              {quote.outside_base_area && (
                <Line label="Transport" value={formatPeso(quote.travel_fee)} />
              )}
              <div className="border-line mt-2 border-t pt-4">
                {quote.total !== null ? (
                  <Line
                    label="Estimated total"
                    value={formatPeso(quote.total)}
                    strong
                  />
                ) : (
                  <p className="text-bone">
                    Extra hours for this package are quoted separately. We will
                    confirm the price with you.
                  </p>
                )}
              </div>
            </>
          ) : errorMessage ? (
            <p className="text-bone">{errorMessage}</p>
          ) : (
            <p className="text-mute">Calculating…</p>
          )}
        </dl>

        {turnaround && <p className="text-stone mt-6 text-xs">{turnaround}.</p>}
        <p className="text-mute mt-2 text-xs">
          This is an estimate. A booking request is not confirmed until we
          reply.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={bookingHref}
            className="bg-brass text-brass-ink rounded-md px-5 py-3 text-center text-sm font-medium"
          >
            Proceed to booking
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 ${strong ? "text-bone text-lg" : "text-stone"}`}
    >
      <dt>{label}</dt>
      <dd className={`tabular-nums ${strong ? "text-brass" : "text-bone"}`}>
        {value}
      </dd>
    </div>
  );
}

function chip(active: boolean) {
  return `cursor-pointer rounded-full border px-5 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brass ${
    active
      ? "border-brass bg-brass text-brass-ink"
      : "border-line text-stone hover:border-mute"
  }`;
}

// Start at the package's own hours; whole-event packages start at 4.
function defaultHours(p: PackageRow) {
  return p.max_hours ?? 4;
}