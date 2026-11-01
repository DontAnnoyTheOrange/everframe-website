import type { Metadata } from "next";
import PortfolioGrid, {
  type GridCard,
} from "@/components/portfolio/PortfolioGrid";
import { CLOUD_NAME } from "@/lib/cloudinary/url";
import { getPortfolio } from "@/lib/data/portfolio";
import { videoFromStored } from "@/lib/portfolio/video";

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
  const initial = data?.categories.find((c) => c.slug === category)?.slug ?? "";
  const imagesOn = CLOUD_NAME.test(cloud) && !cloud.startsWith("YOUR-");
  const cards: GridCard[] = (data?.cards ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    categorySlug: c.category_slug,
    categoryName: c.category_name,
    featured: c.is_featured,
    imageCount: c.imageCount,
    hasVideo: videoFromStored(c.video_url) !== null,
    cover: c.cover
      ? {
          publicId: c.cover.cloudinary_public_id,
          width: c.cover.width,
          height: c.cover.height,
          alt: c.cover.alt_text,
        }
      : null,
  }));

  return (
    <main className="px-6 pt-6 pb-24 md:px-16">
      <p className="text-brass text-xs tracking-[0.25em] uppercase">
        Portfolio
      </p>
      <h1 className="text-bone mt-2 font-serif text-4xl md:text-6xl">
        Moments we have framed
      </h1>
      <p className="text-stone mt-4 max-w-xl">
        Weddings, debuts, corporate events and concerts, photographed and filmed
        by Ian Arzaga.
      </p>

      {!data ? (
        <p className="text-stone mt-10 max-w-md">
          We could not load the portfolio right now. Please try again in a
          moment.
        </p>
      ) : (
        <PortfolioGrid
          cards={cards}
          categories={data.categories}
          initial={initial}
          cloud={imagesOn ? cloud : ""}
        />
      )}
    </main>
  );
}