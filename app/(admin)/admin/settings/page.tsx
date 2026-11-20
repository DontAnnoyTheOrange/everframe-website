import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import {
  SiteContentEditor,
  type Review,
  type TabKey,
} from "@/components/admin/SettingsForm";
import { ErrorNote, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Website content",
  robots: { index: false, follow: false },
};

const asText = (v: unknown) => (typeof v === "string" ? v : "");
const asNum = (v: unknown) => (typeof v === "number" ? String(v) : "");
const TAB_KEYS: TabKey[] = ["profile", "contact", "social", "homepage", "reviews", "contactpage"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { supabase, displayName } = await requireAdmin();
  const { tab } = await searchParams;
  const initialTab = TAB_KEYS.find((k) => k === tab) ?? "profile";
  const [settings, reviews] = await Promise.all([
    supabase.from("site_settings").select("key,value"),
    supabase
      .from("testimonials")
      .select("id,quote,author,is_published,sort_order")
      .order("sort_order")
      .limit(100),
  ]);
  const failed = settings.error ?? reviews.error;
  if (failed) console.error("site content failed:", failed.message);

  const s = Object.fromEntries(
    (settings.data ?? []).map((r) => [r.key as string, r.value]),
  );
  const socials = (
    s.socials && typeof s.socials === "object" ? s.socials : {}
  ) as Record<string, unknown>;
  const initial = {
    messenger: asText(s.messenger_url),
    email: asText(s.contact_email),
    phone: asText(s.contact_phone),
    serviceArea: asText(s.service_area),
    aboutText: asText(s.about_text),
    eventsShot: asNum(s.events_shot),
    yearsExperience: asNum(s.years_experience),
    facebook: asText(socials.facebook),
    instagram: asText(socials.instagram),
    tiktok: asText(socials.tiktok),
    youtube: asText(socials.youtube),
  };
  const list: Review[] = (reviews.data ?? []).map((t) => ({
    id: t.id as string,
    quote: t.quote as string,
    author: t.author as string,
    published: t.is_published === true,
  }));

  return (
    <AdminShell name={displayName} current={initialTab === "reviews" ? "reviews" : "settings"}>
      <PageHeader
        eyebrow="Website management"
        title="Website content"
        description="What visitors see on the homepage and Contact page. Anything you leave empty is simply not shown, so the site never displays made-up details."
      />
      {failed && (
        <ErrorNote>Could not load everything. Refresh the page.</ErrorNote>
      )}
      <SiteContentEditor key={initialTab} initial={initial} reviews={list} initialTab={initialTab} />
    </AdminShell>
  );
}