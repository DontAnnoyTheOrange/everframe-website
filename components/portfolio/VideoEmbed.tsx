import type { VideoInfo } from "@/lib/portfolio/video";

// A project's video. YouTube and Vimeo play inside the page (only when the visitor presses play: the
// player loads lazily). A Facebook video opens on Facebook, which does not allow embedding.
export default function VideoEmbed({
  video,
  title,
}: {
  video: VideoInfo;
  title: string;
}) {
  return (
    <section aria-labelledby="video-heading" className="mt-12">
      <h2 id="video-heading" className="text-bone font-serif text-2xl">
        Video highlights
      </h2>
      {video.embedSrc ? (
        <div className="border-line mt-4 aspect-video w-full max-w-4xl overflow-hidden rounded-sm border bg-black">
          <iframe
            src={video.embedSrc}
            title={`${title}: video`}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full"
          />
        </div>
      ) : (
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="border-line text-bone hover:border-brass mt-4 inline-block rounded-md border px-5 py-3 text-sm"
        >
          Watch the video on Facebook ↗
        </a>
      )}
    </section>
  );
}