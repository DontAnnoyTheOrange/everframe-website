import type { Metadata } from "next";
import PriceCalculator from "@/components/booking/PriceCalculator";
import { getCatalog } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Photo, video and photo + video packages for events. Build an estimate and request a booking.",
};

export const revalidate = 60;

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ package?: string }>;
}) {
  const { package: packageSlug } = await searchParams;
  const catalog = await getCatalog();

  return (
    <main className="px-6 pt-6 pb-24 md:px-16">
      <p className="text-brass text-xs tracking-[0.25em] uppercase">Pricing</p>
      <h1 className="text-bone mt-2 mb-2 font-serif text-4xl md:text-5xl">
        Choose your coverage
      </h1>
      <p className="text-stone mb-10 max-w-xl">
        Pick a service and package, set the hours, and see the price. Rates are
        in Philippine pesos.
      </p>

      {catalog && catalog.packages.length > 0 ? (
        <PriceCalculator catalog={catalog} initialPackageSlug={packageSlug} />
      ) : (
        <div className="border-line bg-ink-2 text-stone max-w-xl rounded-md border p-6">
          <p className="text-bone">Pricing is unavailable right now.</p>
          <p className="mt-2 text-sm">
            Please message us and we will send the rates directly.
          </p>
          {process.env.NODE_ENV === "development" && (
            <p className="text-mute mt-4 text-sm">
              Developer note: Supabase is not connected or returned no packages.
              Check .env.local and that all five migration files (001 to 005)
              were run.
            </p>
          )}
        </div>
      )}
    </main>
  );
}