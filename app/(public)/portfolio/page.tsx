import type { Metadata } from "next";
import Link from "next/link";
import CloudImage from "@/components/portfolio/CloudImage";
import { CLOUD_NAME } from "@/lib/cloudinary/url";
import { getPortfolio } from "@/lib/data/portfolio";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Recent weddings, debuts, corporate events and concerts photographed and filmed by Everframe Productions.",
};

// Read fresh so a project you publish shows up right away.
export const dynamic = "force-dynamic";

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const data = await getPortfolio();
  const active = data?.categories.find((c) => c.slug === category)?.slug;
  const cards = (data?.cards ?? []).filter(
    (c) => !active || c.category_slug === active,
  );
  const imagesOn = CLOUD_NAME.test(cloud) && !cloud.startsWith("YOUR-");

  return (
    <main className="px-6 pt-6 pb-24 md:px-16">
      <p className="text-brass text-xs tracking-[0.25em] uppercase">
        Portfolio
      </p>
      <h1 className="text-bone mt-2 font-serif text-4xl md:text-5xl">
        Moments we have framed
      </h1>

      {data && data.categories.length > 0 && (
        <nav
          aria-label="Filter by event type"
          className="mt-8 flex flex-wrap gap-2"
        >
          {[{ slug: "", name: "All" }, ...data.categories].map((c) => (
            <Link
              key={c.slug || "all"}
              href={c.slug ? `/portfolio?category=${c.slug}` : "/portfolio"}
              aria-current={
                (c.slug || undefined) === active ? "page" : undefined
              }
              className={`rounded-full border px-4 py-1.5 text-sm ${
                (c.slug || undefined) === active
                  ? "border-brass bg-brass text-brass-ink"
                  : "border-line text-stone hover:text-bone"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      {!data && (
        <p className="text-stone mt-10 max-w-md">
          We could not load the portfolio right now. Please try again in a
          moment.
        </p>
      )}
      {data && cards.length === 0 && (
        <p className="text-stone mt-10 max-w-md">
          {active
            ? "No projects in this category yet."
            : "Our portfolio is being prepared. Please check back soon, or message us to see recent work."}
        </p>
      )}

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.id}>
            <Link href={`/portfolio/${c.slug}`} className="group block">
              <div className="border-line bg-ink-2 aspect-[4/3] overflow-hidden rounded-md border">
                {c.cover && imagesOn ? (
                  <CloudImage
                    cloud={cloud}
                    publicId={c.cover.cloudinary_public_id}
                    width={c.cover.width}
                    height={c.cover.height}
                    alt={c.cover.alt_text || c.title}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="text-mute flex h-full items-center justify-center text-sm">
                    Photos coming soon
                  </div>
                )}
              </div>
              <p className="text-brass mt-3 text-xs tracking-[0.2em] uppercase">
                {c.category_name}
              </p>
              <h2 className="text-bone font-serif text-2xl">{c.title}</h2>
              <p className="text-mute text-sm">
                {c.imageCount} {c.imageCount === 1 ? "photo" : "photos"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}