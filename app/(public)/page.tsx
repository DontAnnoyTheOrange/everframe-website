import Link from "next/link";
import HeroPhotographer from "@/components/public/HeroPhotographer";
import PackagesOverview from "@/components/public/PackagesOverview";
import { getCatalog } from "@/lib/data/catalog";

export const revalidate = 60;

export default async function Home() {
  const catalog = await getCatalog();
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
            <div className="flex gap-3">
              <a
                href="#featured"
                className="bg-brass text-brass-ink rounded-md px-6 py-3 text-sm font-medium"
              >
                See our work
              </a>
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

        {/* Portfolio teaser grid */}
        <div
          id="featured"
          className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          <div className="flex h-48 items-end rounded-lg bg-[#4A1B0C] p-4">
            <span className="text-sm text-[#F5C4B3]">Weddings</span>
          </div>
          <div className="flex h-48 items-end rounded-lg bg-[#412402] p-4">
            <span className="text-sm text-[#FAC775]">Debuts</span>
          </div>
          <div className="flex h-48 items-end rounded-lg bg-[#26215C] p-4">
            <span className="text-sm text-[#CECBF6]">Corporate</span>
          </div>
        </div>
      </section>
      {catalog && catalog.packages.length > 0 && (
        <PackagesOverview catalog={catalog} />
      )}
    </main>
  );
}