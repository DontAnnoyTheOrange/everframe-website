import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Gallery from "@/components/portfolio/Gallery";
import { CLOUD_NAME } from "@/lib/cloudinary/url";
import VideoEmbed from "@/components/portfolio/VideoEmbed";
import { getPortfolio, getProject } from "@/lib/data/portfolio";
import { videoFromStored } from "@/lib/portfolio/video";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const found = await getProject(slug);
  if (!found || found === "missing") return { title: "Portfolio" };
  return {
    title: found.project.title,
    description:
      found.project.description?.slice(0, 160) ||
      `${found.project.category_name} by Everframe Productions.`,
  };
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const found = await getProject(slug);
  if (found === "missing") notFound();
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const imagesOn = CLOUD_NAME.test(cloud) && !cloud.startsWith("YOUR-");
  // "Next project": the one after this in the Portfolio order, looping back to the first.
  const all = (await getPortfolio())?.cards ?? [];
  const at = all.findIndex((c) => c.slug === slug);
  const next = all.length > 1 && at >= 0 ? all[(at + 1) % all.length] : null;
  const video = found ? videoFromStored(found.project.video_url) : null;

  return (
    <main className="px-6 pt-6 pb-24 md:px-16">
      <Link
        href="/portfolio"
        className="text-stone inline-flex min-h-11 items-center text-sm underline"
      >
        ← All projects
      </Link>
      {!found ? (
        <p className="text-stone mt-10 max-w-md">
          We could not load this project right now. Please try again in a
          moment.
        </p>
      ) : (
        <>
          <p className="text-brass mt-6 text-xs tracking-[0.25em] uppercase">
            {found.project.category_name}
          </p>
          <h1 className="text-bone mt-2 font-serif text-4xl md:text-6xl">
            {found.project.title}
          </h1>
          {found.project.description && (
            <p className="text-stone mt-4 max-w-2xl whitespace-pre-line">
              {found.project.description}
            </p>
          )}
          <div className="mt-10">
            {found.images.length > 0 && imagesOn ? (
              <Gallery
                cloud={cloud}
                images={found.images}
                title={found.project.title}
              />
            ) : (
              <p className="text-mute">Photos coming soon.</p>
            )}
          </div>
          {video && <VideoEmbed video={video} title={found.project.title} />}
          <div className="border-line mt-16 flex flex-wrap items-center justify-between gap-6 border-t pt-8">
            {next ? (
              <Link href={`/portfolio/${next.slug}`} className="group">
                <span className="text-mute text-xs tracking-[0.2em] uppercase">
                  Next project
                </span>
                <span className="text-bone group-hover:text-brass mt-1 block font-serif text-2xl">
                  {next.title} →
                </span>
              </Link>
            ) : (
              <span />
            )}
            <Link
              href="/booking"
              className="bg-brass text-brass-ink rounded-md px-6 py-3 text-sm font-medium"
            >
              Book a session
            </Link>
          </div>
        </>
      )}
    </main>
  );
}