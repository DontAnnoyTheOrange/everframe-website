// Cloudinary links and the rules for ids. No secrets here: this file is safe to use in the browser.

/** Every photo we upload lives in this folder, so a public id must start with it. */
export const PORTFOLIO_FOLDER = "everframe/portfolio";
export const PUBLIC_ID = /^everframe\/portfolio\/[A-Za-z0-9_-]{4,100}$/;
export const CLOUD_NAME = /^[A-Za-z0-9_-]{2,64}$/;

/** A delivery link that resizes to `width` and lets Cloudinary pick the best format and quality. */
export function cloudinaryUrl(
  cloud: string,
  publicId: string,
  width: number,
): string {
  const w = Math.max(16, Math.min(4000, Math.round(width)));
  const path = publicId.split("/").map(encodeURIComponent).join("/");
  return `https://res.cloudinary.com/${encodeURIComponent(cloud)}/image/upload/f_auto,q_auto,c_limit,w_${w}/${path}`;
}