"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getQuote, type QuoteResult } from "@/app/(public)/pricing/actions";
import {
  SERVICE_LABEL,
  SERVICE_ORDER,
  formatPeso,
  hoursLabel,
} from "@/lib/format";
import {
  coverageLabel,
  limitNote,
  resolvePackage,
  tiersFor,
} from "@/lib/pricing/packageRules";
import { OTHER_LABEL_MAX, validateOtherLabel } from "@/lib/booking/eventType";
import type { Catalog, PackageRow, ServiceType } from "@/lib/types/db";

const MAX_HOURS = 12;

type Props = { catalog: Catalog; initialPackageSlug?: string };

export default function PriceCalculator({
  catalog,
  initialPackageSlug,
}: Props) {
  const { packages, addons, includedAddons, categories } = catalog;
  const reduce = useReducedMotion();

  const services = SERVICE_ORDER.filter((s) =>
    packages.some((p) => p.service_type === s),
  );
  const initial =
    packages.find((p) => p.slug === initialPackageSlug) ?? packages[0];

  const [service, setService] = useState<ServiceType>(initial.service_type);
  // The package the customer clicked. The package in force (`pkg`) can be a higher tier
  // when the hours go past what the clicked one covers. See lib/pricing/packageRules.ts.
  const [chosenId, setChosenId] = useState(initial.id);
  const [hours, setHours] = useState(defaultHours(initial));
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [otherText, setOtherText] = useState("");
  const [otherTouched, setOtherTouched] = useState(false);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [outsideBase, setOutsideBase] = useState(false);

  const tiers = tiersFor(packages, service);
  const chosen = tiers.find((p) => p.id === chosenId) ?? tiers[0];
  const pkg = resolvePackage(tiers, chosen.id, hours);
  const nextTier = tiers[tiers.indexOf(pkg) + 1];
  const autoSwitched = pkg.id !== chosen.id;

  const category = categories.find((c) => c.slug === categorySlug);
  const isOther = category?.is_other === true;
  const otherCheck = isOther ? validateOtherLabel(otherText) : null;
  const otherError =
    otherCheck && !otherCheck.ok && otherTouched ? otherCheck.message : null;
  const canProceed = !otherCheck || otherCheck.ok;
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
    setChosenId(p.id);
    // Clicking the package that is already in force keeps the hours the customer set.
    if (p.id !== pkg.id) setHours(defaultHours(p));
  }
  function chooseCategory(slug: string) {
    setCategorySlug(slug);
    setOtherText(""); // switching away from "Others" clears what was typed
    setOtherTouched(false);
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
    if (otherCheck?.ok) q.set("other", otherCheck.value);
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
            {tiers.map((p) => {
              const active = p.id === pkg.id;
              return (
                <label
                  key={p.id}
                  className={`has-[:focus-visible]:outline-brass relative flex cursor-pointer flex-col gap-1 rounded-md border p-5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${
                    active
                      ? "border-transparent"
                      : "border-line hover:border-mute"
                  }`}
                  data-active={active}
                >
                  {active && (
                    <motion.span
                      layoutId={reduce ? undefined : "package-highlight"}
                      aria-hidden="true"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 34,
                      }}
                      className="border-brass bg-brass/[0.07] pointer-events-none absolute inset-0 rounded-md border"
                    />
                  )}
                  <input
                    type="radio"
                    name="package"
                    className="sr-only"
                    checked={active}
                    onChange={() => choosePackage(p)}
                  />
                  <span className="relative flex items-start justify-between gap-2">
                    <span className="text-bone font-serif text-2xl">
                      {p.name}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] transition-colors ${
                        active
                          ? "border-brass bg-brass text-brass-ink"
                          : "border-line text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </span>
                  <span className="text-brass relative text-lg tabular-nums">
                    {formatPeso(p.price)}
                  </span>
                  <span className="text-mute relative text-xs">
                    {hoursLabel(p.max_hours)}
                  </span>
                </label>
              );
            })}
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
              onChange={(e) => chooseCategory(e.target.value)}
              className="border-line bg-ink-2 text-bone w-full rounded-md border px-3 py-2"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            {isOther && (
              <div className="mt-4">
                <label
                  htmlFor="event-type-other"
                  className="text-stone mb-2 block text-sm"
                >
                  Please specify your event type
                </label>
                <input
                  id="event-type-other"
                  type="text"
                  required
                  maxLength={OTHER_LABEL_MAX}
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  onBlur={() => setOtherTouched(true)}
                  aria-invalid={otherError ? true : undefined}
                  aria-describedby={
                    otherError ? "event-type-other-error" : undefined
                  }
                  placeholder="e.g. Baby shower, reunion"
                  className="border-line bg-ink-2 text-bone placeholder:text-mute w-full rounded-md border px-3 py-2"
                />
                {otherError && (
                  <p
                    id="event-type-other-error"
                    role="alert"
                    className="mt-2 text-sm text-[#E8806A]"
                  >
                    {otherError}
                  </p>
                )}
              </div>
            )}
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
                className="text-bone disabled:text-mute h-12 w-12 text-xl transition-colors hover:text-[#C9A24B]"
              >
                −
              </button>
              <output
                aria-live="polite"
                className="text-bone min-w-32 text-center font-serif text-lg"
              >
                {coverageLabel(pkg, hours)}
              </output>
              <button
                type="button"
                aria-label="More hours"
                disabled={hours >= MAX_HOURS}
                onClick={() => setHours((h) => Math.min(MAX_HOURS, h + 1))}
                className="text-bone disabled:text-mute h-12 w-12 text-xl transition-colors hover:text-[#C9A24B]"
              >
                +
              </button>
            </div>
            {/* Visual guide: filled bars are your hours; a lighter edge marks where a package ends. */}
            <div aria-hidden="true" className="mt-3 flex max-w-xs gap-1">
              {Array.from({ length: MAX_HOURS }, (_, i) => {
                const h = i + 1;
                const edge = tiers.some((t) => t.max_hours === h);
                return (
                  <span
                    key={h}
                    className={`h-2 flex-1 rounded-sm transition-colors duration-300 ${
                      h <= hours ? "bg-brass" : "bg-line"
                    } ${edge ? "border-bone/70 border-r-2" : ""}`}
                  />
                );
              })}
            </div>
            {pkg.max_hours === null && (
              <p className="text-stone mt-2 text-xs">
                About {hours} {hours === 1 ? "hour" : "hours"} for scheduling
              </p>
            )}
            <AnimatePresence initial={false}>
              {autoSwitched && (
                <motion.p
                  key="switched"
                  role="status"
                  initial={reduce ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={reduce ? undefined : { opacity: 0, height: 0 }}
                  className="border-brass text-bone mt-3 overflow-hidden border-l-2 pl-3 text-sm"
                >
                  Switched to {pkg.name}: {hours} hours is more than{" "}
                  {chosen.name} covers
                  {chosen.upgrade_above_hours !== null
                    ? ` (up to ${chosen.upgrade_above_hours} hours)`
                    : ""}
                  .
                </motion.p>
              )}
            </AnimatePresence>
            <p className="text-mute mt-2 text-xs">{limitNote(pkg, nextTier)}</p>
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
        className="border-line border-t-brass bg-ink-2 h-fit rounded-md border border-t-2 p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] lg:sticky lg:top-24"
      >
        <h2 className="text-bone font-serif text-2xl">Your estimate</h2>
        <p className="text-mute mt-1 text-sm">
          {SERVICE_LABEL[pkg.service_type]} · {pkg.name} ·{" "}
          {coverageLabel(pkg, hours)}
        </p>
        {category && (
          <p className="text-mute text-sm">
            {isOther
              ? `Event: Others${otherCheck?.ok ? ` (${otherCheck.value})` : ""}`
              : `Event: ${category.name}`}
          </p>
        )}

        <div
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
        </div>

        {turnaround && <p className="text-stone mt-6 text-xs">{turnaround}.</p>}
        <p className="text-mute mt-2 text-xs">
          This is an estimate. A booking request is not confirmed until we
          reply.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {canProceed ? (
            <Link
              href={bookingHref}
              className="bg-brass text-brass-ink rounded-md px-5 py-3 text-center text-sm font-medium"
            >
              Proceed to booking
            </Link>
          ) : (
            <>
              <button
                type="button"
                aria-disabled="true"
                onClick={() => {
                  setOtherTouched(true);
                  document.getElementById("event-type-other")?.focus();
                }}
                className="bg-brass text-brass-ink rounded-md px-5 py-3 text-center text-sm font-medium opacity-60"
              >
                Proceed to booking
              </button>
              <p className="text-stone text-xs">
                Please tell us your event type first.
              </p>
            </>
          )}
        </div>
      </aside>

      {/* Phones: the total and the next step stay in reach while you change options. */}
      {quote && quote.total !== null && canProceed && (
        <>
          <div className="h-16 lg:hidden" aria-hidden="true" />
          <div className="border-line bg-ink/95 fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t px-5 py-3 backdrop-blur lg:hidden">
            <div>
              <p className="text-mute text-[11px] tracking-[0.2em] uppercase">
                Total
              </p>
              <p className="text-brass font-serif text-2xl tabular-nums">
                {formatPeso(quote.total)}
              </p>
            </div>
            <Link
              href={bookingHref}
              className="bg-brass text-brass-ink rounded-md px-5 py-3 text-sm font-medium"
            >
              Continue to booking
            </Link>
          </div>
        </>
      )}
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
  const reduce = useReducedMotion();
  return (
    <dl
      className={`flex items-baseline justify-between gap-4 ${strong ? "text-bone text-lg" : "text-stone"}`}
    >
      <dt>{label}</dt>
      <motion.dd
        key={value}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`tabular-nums ${strong ? "text-brass font-serif text-3xl" : "text-bone"}`}
      >
        {value}
      </motion.dd>
    </dl>
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