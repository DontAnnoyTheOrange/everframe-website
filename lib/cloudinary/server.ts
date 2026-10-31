import "server-only";
import { CLOUD_NAME, PORTFOLIO_FOLDER } from "@/lib/cloudinary/url";
import { signParams } from "@/lib/cloudinary/signature";

export const ALLOWED_FORMATS = "jpg,jpeg,png,webp,heic,avif";

type Config = { cloudName: string; apiKey: string; apiSecret: string };

// Reads the three Cloudinary settings from .env.local. Returns null when any is missing, so the
// admin page can show a setup note instead of failing.
export function getCloudinaryConfig(): Config | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? "";
  if (
    !CLOUD_NAME.test(cloudName) ||
    !apiKey ||
    !apiSecret ||
    [cloudName, apiKey, apiSecret].some((v) => v.startsWith("YOUR-"))
  )
    return null;
  return { cloudName, apiKey, apiSecret };
}

/** What the browser needs to upload ONE batch directly to Cloudinary. The secret never leaves the server. */
export function createUploadSignature() {
  const cfg = getCloudinaryConfig();
  if (!cfg) return null;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    allowed_formats: ALLOWED_FORMATS,
    folder: PORTFOLIO_FOLDER,
    timestamp,
  };
  return {
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    ...params,
    signature: signParams(params, cfg.apiSecret),
  };
}

/** Deletes a file from Cloudinary. Best effort: a failure is logged and never blocks the admin. */
export async function destroyImage(publicId: string): Promise<boolean> {
  const cfg = getCloudinaryConfig();
  if (!cfg) return false;
  const timestamp = Math.floor(Date.now() / 1000);
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: cfg.apiKey,
    signature: signParams({ public_id: publicId, timestamp }, cfg.apiSecret),
  });
  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/destroy`,
      { method: "POST", body, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) console.error("cloudinary destroy failed:", res.status);
    return res.ok;
  } catch (e) {
    console.error("cloudinary destroy error:", (e as Error).message);
    return false;
  }
}