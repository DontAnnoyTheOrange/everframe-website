import Link from "next/link";
import HeroPhotographer from "@/components/public/HeroPhotographer";
import {
  ClosingCta,
  FeaturedWork,
  Journey,
  Reviews,
  StudioSection,
} from "@/components/public/HomeSections";
import PackagesOverview from "@/components/public/PackagesOverview";
import { CLOUD_NAME } from "@/lib/cloudinary/url";
import { getCatalog } from "@/lib/data/catalog";
import { getPortfolio } from "@/lib/data/portfolio";
import { getSiteSettings, getTestimonials } from "@/lib/data/settings";

export const revalidate = 60;

export default async function Home() {
  const [catalog, portfolio, settings, reviews] = await Promise.all([
    getCatalog(),
    getPortfolio(),
    getSiteSettings(),
    getTestimonials(),
  ]);
  const cloudEnv = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const cloud =
    CLOUD_NAME.test(cloudEnv) && !cloudEnv.startsWith("YOUR-") ? cloudEnv : "";
  return (
    <main className="min-h-screen bg-black">
      {/* Hero */}
      <section className="px-6 pt-10 pb-16 md:px-16 md:pt-16 md:pb-24">
        <div className="grid items-center gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="max-w-xl">
            <p className="mb-3 text-sm text-[#8A8578]">
              Weddings — debuts — corporate — concerts
            </p>
            <h1 className="mb-4 font-serif text-4xl leading-tight text-[#F5F1EA] md:text-5xl">
              We freeze the moments you&apos;ll want to relive
            </h1>
            <p className="mb-8 text-base leading-relaxed text-[#B8B3A6]">
              Photography and videography for events across the Philippines.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/portfolio"
                className="bg-brass text-brass-ink rounded-md px-6 py-3 text-sm font-medium"
              >
                See our work
              </Link>
              <Link
                href="/pricing"
                className="border-line text-bone rounded-md border px-6 py-3 text-sm"
              >
                View packages
              </Link>
            </div>
          </div>
          <HeroPhotographer />
        </div>
      </section>

      <FeaturedWork cards={portfolio?.cards ?? []} cloud={cloud} />
      <StudioSection
        settings={settings}
        homeBase={catalog?.homeBase ?? "Dasmariñas, Cavite"}
      />
      {catalog && catalog.packages.length > 0 && (
        <PackagesOverview catalog={catalog} />
      )}
      <Journey catalog={catalog} />
      <Reviews items={reviews} />
      <ClosingCta settings={settings} />
    </main>
  );
}