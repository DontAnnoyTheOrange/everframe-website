import type { Metadata } from "next";
import Link from "next/link";
import BookingForm from "@/components/booking/BookingForm";
import { getQuote } from "@/app/(public)/pricing/actions";
import { todayInManila } from "@/lib/booking/manila";
import { resolveSelection, type BookingParams } from "@/lib/booking/selection";
import { getBusyRanges } from "@/lib/data/busy";
import { getCatalog } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Book",
  description:
    "Pick your date and send a booking request to Everframe Productions.",
};

// Always read fresh: the calendar must show the latest confirmed bookings.
export const dynamic = "force-dynamic";

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<BookingParams>;
}) {
  const params = await searchParams;
  const catalog = await getCatalog();

  if (!catalog || catalog.packages.length === 0) {
    return (
      <Shell>
        <p className="text-stone max-w-md">
          Booking is not available right now. Please try again in a moment or
          contact us directly.
        </p>
      </Shell>
    );
  }

  const selection = resolveSelection(
    catalog.packages,
    catalog.categories,
    catalog.addons,
    params,
  );
  if (!selection) {
    return (
      <Shell>
        <p className="text-stone max-w-md">
          Please choose your package first so we can show the right price and
          hours.
        </p>
        <Link
          href="/pricing"
          className="bg-brass text-brass-ink mt-6 inline-block rounded-md px-5 py-3 text-sm font-medium"
        >
          Go to pricing
        </Link>
      </Shell>
    );
  }

  const { pkg, hours, addonIds, outsideBase } = selection;
  // The price is worked out by the database, never by the browser.
  const [quoted, busy] = await Promise.all([
    getQuote({ packageId: pkg.id, hours, addonIds, outsideBase }),
    getBusyRanges(),
  ]);

  const back = new URLSearchParams({ package: pkg.slug });
  const changeHref = `/pricing?${back.toString()}`;

  if (!quoted.ok) {
    return (
      <Shell>
        <p className="text-stone max-w-md">{quoted.message}</p>
        <Link
          href={changeHref}
          className="bg-brass text-brass-ink mt-6 inline-block rounded-md px-5 py-3 text-sm font-medium"
        >
          Back to pricing
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <BookingForm
        todayKey={todayInManila()}
        busy={busy}
        categories={catalog.categories}
        pkg={pkg}
        hours={hours}
        quote={quoted.quote}
        initialCategoryId={selection.categoryId}
        initialOther={selection.other}
        addonIds={addonIds}
        outsideBase={outsideBase}
        turnaround={catalog.turnaround[pkg.service_type]}
        changeHref={changeHref}
        mapsKey={process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY?.trim() || null}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="px-6 pt-6 pb-24 md:px-16">
      <p className="text-brass text-xs tracking-[0.25em] uppercase">Booking</p>
      <h1 className="text-bone mt-2 mb-8 font-serif text-4xl md:text-5xl">
        Request your date
      </h1>
      {children}
    </main>
  );
}