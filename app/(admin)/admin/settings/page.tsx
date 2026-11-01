import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import { SettingsForm, TestimonialForm } from "@/components/admin/SettingsForm";
import { requireAdmin } from "@/lib/auth/dal";
import { deleteTestimonial, setTestimonialPublished } from "./actions";

export const metadata: Metadata = {
  title: "Site content",
  robots: { index: false, follow: false },
};

const asText = (v: unknown) => (typeof v === "string" ? v : "");
const asNum = (v: unknown) => (typeof v === "number" ? String(v) : "");

export default async function SettingsPage() {
  const { supabase, displayName } = await requireAdmin();
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

  return (
    <AdminShell name={displayName} current="settings">
      <h1 className="text-2xl font-semibold">Site content</h1>
      <p className="mt-2 text-sm text-neutral-600">
        What visitors see on the homepage and Contact page. Anything you leave
        empty is simply not shown, so the site never displays made-up details.
      </p>
      {failed && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          Could not load everything. Refresh the page.
        </p>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SettingsForm initial={initial} />
        <div className="flex flex-col gap-6">
          <TestimonialForm />
          <section className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="font-semibold">Client reviews</h2>
            {(reviews.data ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-neutral-600">No reviews yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-neutral-200">
                {(reviews.data ?? []).map((t) => (
                  <li key={t.id as string} className="py-3 text-sm">
                    <p>&ldquo;{t.quote as string}&rdquo;</p>
                    <p className="mt-1 text-neutral-500">
                      {t.author as string} ·{" "}
                      {t.is_published ? "Shown" : "Hidden"}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <form action={setTestimonialPublished}>
                        <input type="hidden" name="id" value={t.id as string} />
                        <input
                          type="hidden"
                          name="publish"
                          value={t.is_published ? "0" : "1"}
                        />
                        <button className="rounded-md border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100">
                          {t.is_published ? "Hide" : "Show"}
                        </button>
                      </form>
                      <form action={deleteTestimonial}>
                        <input type="hidden" name="id" value={t.id as string} />
                        <button className="rounded-md border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50">
                          Delete
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}