import { normalizePhone } from "../booking/bookingSchema";

// Contact links shown on the public site. Everything the admin types is checked here when it is
// saved AND again before it is shown, so a bad or hostile value can never become a clickable link.

export const SOCIALS = [
  { key: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.com"] },
  { key: "instagram", label: "Instagram", hosts: ["instagram.com"] },
  { key: "tiktok", label: "TikTok", hosts: ["tiktok.com"] },
  { key: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"] },
] as const;

export type SocialKey = (typeof SOCIALS)[number]["key"];

/** A social page link: https only, on that platform's own website, no passwords. Empty is allowed. */
export function cleanSocialUrl(
  key: SocialKey,
  raw: string,
): { ok: true; url: string } | { ok: false; message: string } {
  const text = raw.trim();
  if (text === "") return { ok: true, url: "" };
  const social = SOCIALS.find((s) => s.key === key);
  if (!social) return { ok: false, message: "Unknown platform." };
  const label = social.label;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text)
    ? text
    : `https://${text}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return { ok: false, message: `That does not look like a ${label} link.` };
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const onPlatform = social.hosts.some(
    (h) => host === h || host.endsWith(`.${h}`),
  );
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !onPlatform
  )
    return {
      ok: false,
      message: `Please paste your ${label} page link (https://${social.hosts[0]}/...).`,
    };
  if (u.pathname.replace(/\//g, "") === "" && !u.search)
    return {
      ok: false,
      message: `Please paste the link to your ${label} page, not just the home page.`,
    };
  return { ok: true, url: u.toString().slice(0, 300) };
}

/** For display: returns the link only if it passes the same check, otherwise null. */
export function socialHref(key: SocialKey, stored: unknown): string | null {
  if (typeof stored !== "string") return null;
  const r = cleanSocialUrl(key, stored);
  return r.ok && r.url ? r.url : null;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function cleanEmailSetting(
  raw: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const v = raw.trim();
  if (v === "") return { ok: true, value: "" };
  if (v.length > 254 || !EMAIL.test(v))
    return { ok: false, message: "That email does not look right." };
  return { ok: true, value: v };
}

export function cleanPhoneSetting(
  raw: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const v = raw.trim();
  if (v === "") return { ok: true, value: "" };
  const digits = normalizePhone(v);
  if (!/^\+?\d{7,15}$/.test(digits))
    return {
      ok: false,
      message: "Please enter a phone number with 7 to 15 digits.",
    };
  return { ok: true, value: digits };
}

export function emailHref(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const r = cleanEmailSetting(v);
  return r.ok && r.value ? `mailto:${r.value}` : null;
}

export function phoneHref(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const r = cleanPhoneSetting(v);
  return r.ok && r.value ? `tel:${r.value}` : null;
}

/** A whole-number setting (events shot, years). Empty means "do not show". */
export function cleanCount(
  raw: string,
  max: number,
  label: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  const v = raw.trim();
  if (v === "") return { ok: true, value: null };
  if (!/^\d{1,6}$/.test(v) || Number(v) > max)
    return {
      ok: false,
      message: `${label} must be a whole number from 0 to ${max}.`,
    };
  return { ok: true, value: Number(v) };
}