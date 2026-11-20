import HomeHero from "@/components/public/HomeHero";
import ServicesSection, {
  type ServiceImage,
  type ServiceItem,
} from "@/components/public/ServicesSection";
import FeaturedExhibition, {
  type ExhibitItem,
} from "@/components/public/FeaturedExhibition";
import {
  ClosingCta,
  Journey,
  Reviews,
  SectionFallback,
  StudioSection,
} from "@/components/public/HomeSections";
import PackagesOverview from "@/components/public/PackagesOverview";
import { CLOUD_NAME } from "@/lib/cloudinary/url";
import { getCatalog } from "@/lib/data/catalog";
import { getPortfolio } from "@/lib/data/portfolio";
import { getSiteSettings, getTestimonials } from "@/lib/data/settings";
import { formatPeso } from "@/lib/format";

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
  // Featured projects come first (getPortfolio sorts them); the exhibition shows up to 8 covers.
  const exhibit: ExhibitItem[] = (portfolio?.cards ?? [])
    .filter((c) => c.cover)
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      categoryName: c.category_name,
      cover: {
        publicId: c.cover!.cloudinary_public_id,
        width: c.cover!.width,
        height: c.cover!.height,
        alt: c.cover!.alt_text,
      },
    }));
  // Services. Each event type uses a real photo from the portfolio in that category when one exists.
  const coverFor = (re: RegExp): ServiceImage => {
    const c = (portfolio?.cards ?? []).find(
      (x) => x.cover && re.test(x.category_slug),
    );
    return c?.cover && cloud
      ? {
          kind: "cloud",
          cloud,
          publicId: c.cover.cloudinary_public_id,
          width: c.cover.width,
          height: c.cover.height,
          alt: c.cover.alt_text || `${c.title}, ${c.category_name}`,
        }
      : null;
  };
  const from = (type: string) => {
    const prices = (catalog?.packages ?? [])
      .filter((p) => p.service_type === type)
      .map((p) => p.price);
    return prices.length ? `From ${formatPeso(Math.min(...prices))}` : null;
  };
  const services: ServiceItem[] = [
    {
      key: "wedding",
      title: "Wedding photography",
      text: "From the preparations to the last dance: genuine, unposed moments of your day.",
      note: from("photo"),
      image: coverFor(/wedd/),
    },
    {
      key: "debut",
      title: "Debut & birthday photography",
      text: "Debuts, 7th birthdays and celebrations, with the people and details that make them yours.",
      note: from("photo"),
      image: coverFor(/debut|birthday/),
    },
    {
      key: "corporate",
      title: "Corporate photography",
      text: "Launches, conferences and team events, covered clearly and professionally.",
      note: from("photo"),
      image: coverFor(/corporate/),
    },
    {
      key: "concert",
      title: "Concert photography",
      text: "Stage, crowd and atmosphere, captured as it happens.",
      note: from("photo"),
      image: coverFor(/concert/),
    },
    {
      key: "video",
      title: "Videography",
      text: `Cinematic highlight videos and event coverage. ${catalog?.turnaround.video ?? "Edited video within 2 weeks after the event"}.`,
      note: from("video"),
      image: {
        kind: "local",
        src: "/photographer/camera-bw.webp",
        alt: "Ian Arzaga behind his camera on a gimbal.",
      },
    },
    {
      key: "combo",
      title: "Photo + Video",
      text: "One photographer and videographer for the whole day, so photos and film come from the same eyes.",
      note: from("photo_video"),
      image: null,
    },
  ];
  return (
    <main className="min-h-screen bg-black">
      <HomeHero />
      <div id="after-hero" />
      <div id="work" className="scroll-mt-[72px]">
        {cloud && exhibit.length > 0 ? (
          <FeaturedExhibition items={exhibit} cloud={cloud} />
        ) : (
          <SectionFallback
            id="work-empty"
            eyebrowText="Portfolio"
            title="Our work"
            text="Browse the events we have covered, from weddings and debuts to corporate events and concerts."
            href="/portfolio"
            label="Open the portfolio"
          />
        )}
      </div>
      <StudioSection
        settings={settings}
        homeBase={catalog?.homeBase ?? "Dasmariñas, Cavite"}
      />
      <ServicesSection items={services} />
      {catalog && catalog.packages.length > 0 ? (
        <PackagesOverview catalog={catalog} />
      ) : (
        <SectionFallback
          id="pricing"
          eyebrowText="Pricing"
          title="Packages and pricing"
          text="See what each package includes and work out the price for your event."
          href="/pricing"
          label="Open the price calculator"
        />
      )}
      <Journey catalog={catalog} />
      <Reviews items={reviews} />
      <ClosingCta settings={settings} />
    </main>
  );
}