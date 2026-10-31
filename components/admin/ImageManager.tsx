"use client";

import { useRef, useState, useTransition } from "react";
import {
  addImages,
  getUploadSignature,
  makeCover,
  moveImage,
  removeImage,
  updateImageText,
  type ImageResult,
} from "@/app/(admin)/admin/portfolio/actions";
import CloudImage from "@/components/portfolio/CloudImage";

export type AdminImage = {
  id: string;
  publicId: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  isCover: boolean;
};

const MAX_MB = 20;
const box =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm";
const small =
  "rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50";

// Upload, order, describe, choose the cover, and remove photos. Photos go straight from the browser
// to Cloudinary using a one-time signature from the server, so the secret key stays on the server.
export default function ImageManager({
  projectId,
  cloud,
  uploadReady,
  images,
}: {
  projectId: string;
  cloud: string;
  uploadReady: boolean;
  images: AdminImage[];
}) {
  const [busy, startTransition] = useTransition();
  const [status, setStatus] = useState<ImageResult | null>(null);
  const [progress, setProgress] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function run(task: () => Promise<ImageResult>) {
    setStatus(null);
    startTransition(async () => {
      const r = await task();
      if (r.message) setStatus(r);
    });
  }

  async function upload(files: File[]) {
    setStatus(null);
    const good = files.filter(
      (f) => f.type.startsWith("image/") && f.size <= MAX_MB * 1024 * 1024,
    );
    if (good.length === 0) {
      setStatus({
        ok: false,
        message: `Please choose photos (JPG, PNG, WebP) of at most ${MAX_MB} MB each.`,
      });
      return;
    }
    const skipped = files.length - good.length;
    const signed = await getUploadSignature();
    if (!signed.ok) {
      setStatus({ ok: false, message: signed.message });
      return;
    }
    const s = signed.sig;
    const done: { publicId: string; width: number; height: number }[] = [];
    let failed = 0;
    for (let i = 0; i < good.length; i++) {
      setProgress(`Uploading ${i + 1} of ${good.length}…`);
      const body = new FormData();
      body.append("file", good[i]);
      body.append("api_key", s.apiKey);
      body.append("timestamp", String(s.timestamp));
      body.append("folder", s.folder);
      body.append("allowed_formats", s.allowed_formats);
      body.append("signature", s.signature);
      try {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`,
          { method: "POST", body },
        );
        const json = (await res.json()) as {
          public_id?: string;
          width?: number;
          height?: number;
        };
        if (res.ok && json.public_id && json.width && json.height)
          done.push({
            publicId: json.public_id,
            width: json.width,
            height: json.height,
          });
        else failed++;
      } catch {
        failed++;
      }
    }
    setProgress("");
    if (fileInput.current) fileInput.current.value = "";
    if (done.length === 0) {
      setStatus({
        ok: false,
        message:
          "The upload failed. Check your Cloudinary values in .env.local, and that the files are real photos.",
      });
      return;
    }
    const saved = await addImages(projectId, done);
    const notes = [saved.message];
    if (failed) notes.push(`${failed} could not be uploaded.`);
    if (skipped)
      notes.push(`${skipped} skipped (not a photo, or over ${MAX_MB} MB).`);
    setStatus({ ok: saved.ok && failed === 0, message: notes.join(" ") });
  }

  return (
    <section aria-label="Photos" className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold">Photos ({images.length})</h2>
        {uploadReady ? (
          <>
            <label
              htmlFor="photo-files"
              className="mt-3 block text-sm text-neutral-700"
            >
              Add photos (you can choose many at once)
            </label>
            <input
              id="photo-files"
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
              multiple
              disabled={busy || progress !== ""}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) startTransition(() => upload(files));
              }}
              className="mt-1 block text-sm"
            />
          </>
        ) : (
          <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">
            Photo upload is not set up yet. Add{" "}
            <code>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code>,{" "}
            <code>CLOUDINARY_API_KEY</code> and{" "}
            <code>CLOUDINARY_API_SECRET</code> to <code>.env.local</code>, then
            restart <code>npm run dev</code>. See section 7 of{" "}
            <code>supabase/README.md</code>.
          </p>
        )}
        {progress && (
          <p role="status" className="mt-2 text-sm text-neutral-700">
            {progress}
          </p>
        )}
        {status && (
          <p
            role={status.ok ? "status" : "alert"}
            className={`mt-2 text-sm ${status.ok ? "text-green-800" : "text-red-700"}`}
          >
            {status.message}
          </p>
        )}
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-neutral-600">No photos yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {images.map((img, i) => (
            <li
              key={img.id}
              className="rounded-lg border border-neutral-200 bg-white p-3"
            >
              <div className="aspect-[4/3] overflow-hidden rounded bg-neutral-100">
                <CloudImage
                  cloud={cloud}
                  publicId={img.publicId}
                  width={img.width}
                  height={img.height}
                  alt={img.alt || `Photo ${i + 1}`}
                  sizes="320px"
                  className="h-full w-full object-cover"
                />
              </div>
              <form
                key={`${img.id}-${img.alt}-${img.caption}`}
                className="mt-3 flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  run(() =>
                    updateImageText(
                      img.id,
                      String(fd.get("alt")),
                      String(fd.get("caption")),
                    ),
                  );
                }}
              >
                <label
                  className="text-xs text-neutral-600"
                  htmlFor={`alt-${img.id}`}
                >
                  Describe the photo (for screen readers and search)
                </label>
                <input
                  id={`alt-${img.id}`}
                  name="alt"
                  maxLength={300}
                  defaultValue={img.alt}
                  className={box}
                />
                <label
                  className="text-xs text-neutral-600"
                  htmlFor={`cap-${img.id}`}
                >
                  Caption (optional, shown in the viewer)
                </label>
                <input
                  id={`cap-${img.id}`}
                  name="caption"
                  maxLength={300}
                  defaultValue={img.caption}
                  className={box}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button disabled={busy} className={small}>
                    Save text
                  </button>
                  <button
                    type="button"
                    disabled={busy || i === 0}
                    aria-label={`Move photo ${i + 1} earlier`}
                    onClick={() => run(() => moveImage(img.id, "up"))}
                    className={small}
                  >
                    ↑ Earlier
                  </button>
                  <button
                    type="button"
                    disabled={busy || i === images.length - 1}
                    aria-label={`Move photo ${i + 1} later`}
                    onClick={() => run(() => moveImage(img.id, "down"))}
                    className={small}
                  >
                    ↓ Later
                  </button>
                  {img.isCover ? (
                    <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                      Cover photo
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => makeCover(img.id))}
                      className={small}
                    >
                      Make cover
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove this photo? This cannot be undone.",
                        )
                      )
                        run(() => removeImage(img.id));
                    }}
                    className={`${small} text-red-700`}
                  >
                    Remove
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}