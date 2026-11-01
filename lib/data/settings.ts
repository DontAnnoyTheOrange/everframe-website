import "server-only";
import { messengerHref } from "@/lib/booking/messenger";
import { createPublicClient } from "@/lib/supabase/public";
import {
  SOCIALS,
  emailHref,
  phoneHref,
  socialHref,
  type SocialKey,
} from "@/lib/site/links";

export type SiteSettings = {
  messengerHref: string | null;
  emailHref: string | null;
  email: string;
  phoneHref: string | null;
  phone: string;
  socials: { key: SocialKey; label: string; href: string }[];
  serviceArea: string;
  aboutText: string;
  eventsShot: number | null;
  yearsExperience: number | null;
};

export type Testimonial = { id: string; quote: string; author: string };

const KEYS = [
  "messenger_url",
  "contact_email",
  "contact_phone",
  "socials",
  "service_area",
  "about_text",
  "events_shot",
  "years_experience",
];

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;

/** The contact details and numbers the admin entered. Never throws: missing data just hides the section. */
export async function getSiteSettings(): Promise<SiteSettings> {
  const empty: SiteSettings = {
    messengerHref: null,
    emailHref: null,
    email: "",
    phoneHref: null,
    phone: "",
    socials: [],
    serviceArea: "",
    aboutText: "",
    eventsShot: null,
    yearsExperience: null,
  };
  const db = createPublicClient();
  if (!db) return empty;
  const { data, error } = await db
    .from("site_settings")
    .select("key,value")
    .in("key", KEYS);
  if (error) {
    console.error("site settings failed:", error.message);
    return empty;
  }
  const s = Object.fromEntries(
    (data ?? []).map((r) => [r.key as string, r.value]),
  );
  const socialsRaw = (
    s.socials && typeof s.socials === "object" ? s.socials : {}
  ) as Record<string, unknown>;
  return {
    messengerHref: messengerHref(str(s.messenger_url) || null),
    emailHref: emailHref(s.contact_email),
    email: str(s.contact_email),
    phoneHref: phoneHref(s.contact_phone),
    phone: str(s.contact_phone),
    socials: SOCIALS.flatMap((p) => {
      const href = socialHref(p.key, socialsRaw[p.key]);
      return href ? [{ key: p.key, label: p.label, href }] : [];
    }),
    serviceArea: str(s.service_area),
    aboutText: str(s.about_text),
    eventsShot: num(s.events_shot),
    yearsExperience: num(s.years_experience),
  };
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db
    .from("testimonials")
    .select("id,quote,author,sort_order")
    .eq("is_published", true)
    .order("sort_order")
    .limit(12);
  if (error) {
    console.error("testimonials failed:", error.message);
    return [];
  }
  return (data ?? []).map((t) => ({
    id: t.id as string,
    quote: t.quote as string,
    author: t.author as string,
  }));
}