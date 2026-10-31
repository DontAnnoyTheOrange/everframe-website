import { createHash } from "node:crypto";

// Cloudinary's signing rule: sort the parameters by name, join them as name=value with &, add the
// API secret at the end, and take the SHA-1. The secret itself is NOT in this file.
export function signParams(
  params: Record<string, string | number>,
  secret: string,
): string {
  const text = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1")
    .update(text + secret)
    .digest("hex");
}